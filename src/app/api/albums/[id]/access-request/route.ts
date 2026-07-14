import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";
import { createAdminNotification } from "@/lib/notifications";

const requestSchema = z.object({
  requester_name: z.string().min(1, "Name is required"),
  requester_phone: z.string().min(1, "Phone number is required"),
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPublicSession();
  
  // Allow anonymous requests. Admin can contact them via phone.
  // if (!session?.userId) {
  //   return apiError("UNAUTHENTICATED", "You must be signed in to request access.", 401);
  // }

  try {
    const p = await params;
    const albumId = p.id;
    
    // Validate album exists and is private
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id, status")
      .eq("id", albumId)
      .single();
      
    if (albumError || !album) {
      return apiError("NOT_FOUND", "Album not found.", 404);
    }
    
    if (album.status !== "private") {
      return apiError("INVALID_INPUT", "This album is not private.", 400);
    }
    
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    
    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }
    
    // Check for existing pending request to avoid 500 crashes
    const { data: existingRequest } = await supabase
      .from("album_access_requests")
      .select("id")
      .eq("album_id", albumId)
      .eq("requester_user_id", session?.userId || null)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return apiError("CONFLICT", "You already have a pending request for this album.", 409);
    }

    // Insert request
    const { data, error } = await supabase
      .from("album_access_requests")
      .insert({
        album_id: albumId,
        requester_user_id: session?.userId || null,
        requester_email: session?.email || null,
        requester_name: parsed.data.requester_name,
        requester_phone: parsed.data.requester_phone,
        reason: parsed.data.reason,
        status: "pending"
      })
      .select("id, status")
      .single();
      
    if (error) {
      if (error.code === "23505") { // Unique violation
        return apiError("CONFLICT", "You already have a pending request for this album.", 409);
      }
      return apiError("SERVER_ERROR", error.message, 500);
    }

    await createAdminNotification({
      type: "admin_new_request",
      title: "New private album request",
      body: `${parsed.data.requester_name} requested access to a private album.`,
      targetUrl: "/studio/access-requests",
      metadata: { album_id: albumId, request_id: data.id },
      request,
      actorSession: session.userId ? session : undefined,
    });
    
    return apiSuccess({ request: data }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
