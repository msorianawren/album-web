import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";
import { decideAccessRequest, type AccessRequestDecision } from "@/lib/access-request-workflow";
import { supabase } from "@/lib/supabase";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected", "denied", "needs_manual_review"]),
  admin_note: z.string().trim().max(1000).optional().nullable(),
  review_note: z.string().trim().max(1000).optional().nullable(),
});

function normalizeDecision(status: string): AccessRequestDecision {
  if (status === "rejected") return "denied";
  return status as AccessRequestDecision;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminSession = await requireAdmin(request);
  if (!adminSession) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const result = await decideAccessRequest({
      requestId: id,
      decision: normalizeDecision(parsed.data.status),
      actorSession: adminSession,
      note: parsed.data.review_note ?? parsed.data.admin_note ?? null,
      request,
    });

    if (!result.ok && result.status === "not_found") {
      return apiError("NOT_FOUND", result.message, 404);
    }

    if (!result.ok) {
      return apiError("INVALID_INPUT", result.message, 400);
    }

    return apiSuccess({ request: result.request, status: result.status });
  } catch (error) {
    return toServerError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminSession = await requireAdmin(request);
  if (!adminSession) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { id } = await params;

    const { error } = await supabase
      .from("album_access_requests")
      .delete()
      .eq("id", id);

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ message: "Request deleted." });
  } catch (error) {
    return toServerError(error);
  }
}
