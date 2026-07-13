import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";

const grantSchema = z.object({
  scope: z.enum(["all_private", "selected_albums"]),
  albumIds: z.array(z.string()).optional(),
  email: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return apiError("UNAUTHENTICATED", "Unauthorized", 401);

  try {
    const p = await params;
    const userId = p.id;
    const body = await request.json();
    const parsed = grantSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const { scope, albumIds, email } = parsed.data;

    // 1. Revoke existing active grants for this user
    await supabase
      .from("album_access_grants")
      .update({
        status: "revoked",
        revoked_by: session.userId,
        revoked_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "active");

    // 2. Insert new grants
    if (scope === "all_private") {
      const { error } = await supabase.from("album_access_grants").insert({
        user_id: userId,
        email_normalized: email || null,
        scope: "all_private",
        granted_by: session.userId,
        status: "active",
      });
      if (error) throw error;
    } else if (scope === "selected_albums" && albumIds && albumIds.length > 0) {
      const grants = albumIds.map((albumId) => ({
        user_id: userId,
        email_normalized: email || null,
        scope: "selected_albums",
        album_id: albumId,
        granted_by: session.userId,
        status: "active",
      }));
      
      const { error } = await supabase.from("album_access_grants").insert(grants);
      if (error) throw error;
    }

    return apiSuccess({ message: "Grants updated successfully" });
  } catch (error) {
    return toServerError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return apiError("UNAUTHENTICATED", "Unauthorized", 401);

  try {
    const p = await params;
    const userId = p.id;

    const { data, error } = await supabase
      .from("album_access_grants")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) throw error;

    return apiSuccess({ grants: data });
  } catch (error) {
    return toServerError(error);
  }
}
