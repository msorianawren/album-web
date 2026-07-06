import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAlbums } from "@/lib/albums";
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

  const albums = await getAlbums(parsed.data);
  return apiSuccess({ albums });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can create albums.", 403);
  }

  try {
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
    const { data, error } = await supabase
      .from("albums")
      .insert({
        owner_id: session.userId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        status: parsed.data.status,
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

    return apiSuccess({ album: data }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
