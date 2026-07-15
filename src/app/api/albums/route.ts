import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAlbums } from "@/lib/albums";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { slugify } from "@/lib/utils";
import { albumCreateSchema, searchParamsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const parsed = searchParamsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid album filters.", 400);
    }

    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
    const albums = await getAlbums({ ...parsed.data, session, userClient });
    return apiSuccess({ albums });
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
    const { data, error } = await client
      .from("albums")
      .insert({
        owner_id: session.userId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        status,
        cover_url: parsed.data.cover_url,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("CONFLICT", "An album with this slug already exists.", 409);
      }
      throw classifyDataFailure(error, "albums.admin_create");
    }

    await logAuditEvent({
      request,
      session,
      action: "admin_create_album",
      targetType: "album",
      targetId: data.id,
      metadata: {
        title: data.title,
        status: data.status,
      },
    });

    return apiSuccess({ album: data }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.albums.create");
  }
}
