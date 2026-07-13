import { NextRequest } from "next/server";
import { requireAdmin, getPublicSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_note: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const p = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const session = await getPublicSession();

    const { data: requestRecord, error: fetchError } = await supabase
      .from("album_access_requests")
      .select("*")
      .eq("id", p.id)
      .single();

    if (fetchError || !requestRecord) {
      return apiError("NOT_FOUND", "Request not found", 404);
    }

    const { data, error } = await supabase
      .from("album_access_requests")
      .update({
        status: parsed.data.status,
        admin_note: parsed.data.admin_note ?? null,
        reviewed_by: session!.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id)
      .select()
      .single();

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    if (parsed.data.status === "approved") {
      // Create explicit grant
      await supabase.from("album_access_grants").insert({
        user_id: requestRecord.requester_user_id || null,
        email_normalized: requestRecord.requester_email || null,
        scope: "selected_albums",
        album_id: requestRecord.album_id,
        status: "active",
        granted_by: session!.userId,
      });
    }

    return apiSuccess({ request: data });
  } catch (error) {
    return toServerError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const p = await params;

    const { error } = await supabase
      .from("album_access_requests")
      .delete()
      .eq("id", p.id);

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ message: "Request deleted." });
  } catch (error) {
    return toServerError(error);
  }
}
