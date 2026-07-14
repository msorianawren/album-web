import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { appendAdminHelpMessage, getAdminHelpThread, updateHelpThreadStatus } from "@/lib/help-chat";

const bodySchema = z.object({ action: z.enum(["reply", "note", "status"]), body: z.string().trim().min(1).max(5000).optional(), status: z.enum(["open", "waiting_admin", "waiting_user", "closed", "archived", "blocked"]).optional() });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(request);
  if (!session) return apiError("FORBIDDEN", "Requires admin privileges.", 403);
  try { const { id } = await params; const result = await getAdminHelpThread(id, Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1)); return result ? apiSuccess(result, { headers: { "Cache-Control": "no-store" } }) : apiError("NOT_FOUND", "Conversation not found.", 404); }
  catch (error) { return toServerError(error); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(request);
  if (!session) return apiError("FORBIDDEN", "Requires admin privileges.", 403);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_INPUT", "Invalid conversation update.", 400);
  try {
    const { id } = await params;
    if (parsed.data.action === "status" && parsed.data.status) { await updateHelpThreadStatus({ session, threadId: id, status: parsed.data.status, request }); return apiSuccess({ status: parsed.data.status }); }
    if (!parsed.data.body) return apiError("INVALID_INPUT", "Reply text cannot be empty.", 400);
    return apiSuccess({ message: await appendAdminHelpMessage({ session, threadId: id, body: parsed.data.body, isInternalNote: parsed.data.action === "note", request }) });
  } catch (error) { return toServerError(error); }
}
