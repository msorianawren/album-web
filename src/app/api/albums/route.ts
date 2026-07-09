import { NextRequest } from "next/server";
import { getPublicSession, requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAlbums } from "@/lib/albums";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import { albumCreateSchema, searchParamsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const parsed = searchParamsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid album filters.", 400);
  }

  const session = await getPublicSession();
  const albums = await getAlbums({ ...parsed.data, session });
  return apiSuccess({ albums });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can create albums.", 403);
  }

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
    const { data, error } = await supabase
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
      const status = error.code === "23505" ? 409 : 500;
      return apiError(
        status === 409 ? "CONFLICT" : "SERVER_ERROR",
        error.message,
        status,
      );
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
    return toServerError(error);
  }
}
