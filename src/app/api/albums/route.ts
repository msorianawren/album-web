import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { ALBUM_DETAIL_SELECT, getAlbumPage } from "@/lib/albums";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { slugify } from "@/lib/utils";
import { albumCreateSchema, albumPageQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const parsed = albumPageQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid album filters.", 400);
    }

    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
    if (!parsed.data.status) {
      return apiError("INVALID_INPUT", "A single album status is required for cursor pagination.", 400);
    }

    const page = await getAlbumPage({ ...parsed.data, status: parsed.data.status, session, userClient });
    const cacheHeader = session.userId 
      ? "private, no-store" 
      : "public, s-maxage=3600, stale-while-revalidate=86400";
    return apiSuccess({ page }, { headers: { "Cache-Control": cacheHeader } });
  } catch (error) {
    return toServerError(error, request, "api.albums.list");
  }
}

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can create albums.", 403);
  }
  const { session, client } = database;

  try {
    const settings = await getSiteSettings();
    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "admin_create_album",
        limit: settings.admin_mutation_rate_limit_count,
        windowSeconds: settings.admin_mutation_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many admin changes. Please wait before trying again.", 429);
    }

    const body = await request.json();
    const parsed = albumCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid album payload.",
        400,
        parsed.error.flatten(),
      );
    }

    const slug = parsed.data.slug ?? slugify(parsed.data.title);
    const status =
      typeof body.status === "string" ? parsed.data.status : settings.default_album_status;

    // Calculate initial sort order so new albums land at position #1 (Top)
    const sortColumn =
      status === "public"
        ? "public_sort_order"
        : status === "updating"
          ? "updating_sort_order"
          : "private_sort_order";

    const { data: minRow } = await client
      .from("albums")
      .select(sortColumn)
      .eq("status", status)
      .is("deleted_at", null)
      .not(sortColumn, "is", null)
      .order(sortColumn, { ascending: true })
      .limit(1)
      .maybeSingle();

    const minOrder = (minRow as Record<string, number | null> | null)?.[sortColumn];
    const initialSortOrder = typeof minOrder === "number" ? minOrder - 10 : 10;

    const { data, error } = await client
      .from("albums")
      .insert({
        owner_id: session.userId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        status,
        cover_url: parsed.data.cover_url,
        feather_purchase_enabled: parsed.data.feather_purchase_enabled ?? true,
        feather_price: parsed.data.feather_price ?? null,
        [sortColumn]: initialSortOrder,
      })
      .select(ALBUM_DETAIL_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("CONFLICT", "An album with this slug already exists.", 409);
      }
      throw classifyDataFailure(error, "albums.admin_create");
    }
    const albumRecord = data as unknown as {
      id: string;
      title: string;
      status: string;
    };

    await logAuditEvent({
      request,
      session,
      action: "admin_create_album",
      targetType: "album",
      targetId: albumRecord.id,
      metadata: {
        title: albumRecord.title,
        status: albumRecord.status,
      },
    });
    revalidateTag("albums:public", "max");
    revalidatePath("/albums");

    return apiSuccess({ album: data }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.albums.create");
  }
}
