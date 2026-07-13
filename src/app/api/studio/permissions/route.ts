import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    // Fetch all users
    const { data: usersData, error: usersError } = await supabase
      .from("user_profiles")
      .select("user_id, email, display_name, avatar_url, last_seen_at")
      .order("last_seen_at", { ascending: false });

    if (usersError) return apiError("SERVER_ERROR", usersError.message, 500);

    // Fetch all invites
    const { data: invitesData, error: invitesError } = await supabase
      .from("album_invites")
      .select("id, email, album_id, is_global, created_at, albums(title)");

    if (invitesError) return apiError("SERVER_ERROR", invitesError.message, 500);

    // Fetch all private albums to help UI know how many albums there are
    const { data: albumsData, error: albumsError } = await supabase
      .from("albums")
      .select("id, title")
      .eq("status", "private");
    
    if (albumsError) return apiError("SERVER_ERROR", albumsError.message, 500);

    return apiSuccess({ 
      users: usersData, 
      invites: invitesData,
      privateAlbums: albumsData
    });
  } catch (error) {
    return toServerError(error);
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const body = await request.json();
    const { email, is_global, album_ids } = body;

    if (!email || typeof email !== "string") {
      return apiError("INVALID_INPUT", "A valid email is required.", 400);
    }

    const lowerEmail = email.toLowerCase();

    // 1. Delete all existing invites for this email
    const { error: deleteError } = await supabase
      .from("album_invites")
      .delete()
      .eq("email", lowerEmail);

    if (deleteError) return apiError("SERVER_ERROR", deleteError.message, 500);

    // 2. Insert new invites
    if (is_global) {
      const { error: insertError } = await supabase
        .from("album_invites")
        .insert({
          email: lowerEmail,
          is_global: true,
          created_by: adminCheck.userId,
        });
      if (insertError) return apiError("SERVER_ERROR", insertError.message, 500);
    } else if (Array.isArray(album_ids) && album_ids.length > 0) {
      const inserts = album_ids.map(id => ({
        email: lowerEmail,
        album_id: id,
        is_global: false,
        created_by: adminCheck.userId,
      }));
      
      const { error: insertError } = await supabase
        .from("album_invites")
        .insert(inserts);
      
      if (insertError) return apiError("SERVER_ERROR", insertError.message, 500);
    }

    // 3. For any approved requests in album_access_requests, we could clean them up, but it's optional.
    // Leaving them as is doesn't hurt, since album_invites is now our primary mechanism.

    return apiSuccess({ success: true });
  } catch (error) {
    return toServerError(error);
  }
}
