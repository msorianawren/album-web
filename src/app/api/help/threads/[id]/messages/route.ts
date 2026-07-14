import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { appendUserHelpMessage, getUserHelpThread } from "@/lib/help-chat";
import { enforceRateLimit } from "@/lib/security-rate-limit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) });
const threadIdSchema = z.string().uuid();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPublicSession(request);
  if (!session.userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStore });
  const client = await createAuthenticatedUserClient(request);
  if (!client) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStore });
  const idResult = threadIdSchema.safeParse((await params).id);
  if (!idResult.success) return NextResponse.json({ success: false, message: "Invalid conversation id." }, { status: 400, headers: noStore });
  try {
    const result = await getUserHelpThread(session, client, idResult.data, Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1));
    return result ? NextResponse.json({ success: true, ...result }, { headers: noStore }) : NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404, headers: noStore });
  } catch { return NextResponse.json({ success: false, message: "Could not load this conversation." }, { status: 500, headers: noStore }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPublicSession(request);
  if (!session.userId || session.isBlocked) return NextResponse.json({ success: false, message: "You cannot send messages from this account." }, { status: 403, headers: noStore });
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Please enter a valid message." }, { status: 400, headers: noStore });
  const idResult = threadIdSchema.safeParse((await params).id);
  if (!idResult.success) return NextResponse.json({ success: false, message: "Invalid conversation id." }, { status: 400, headers: noStore });
  const rate = await enforceRateLimit({ request, session, policy: { action: "help_message_send", limit: 10, windowSeconds: 60 } });
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Please wait before sending another message." }, { status: 429, headers: noStore });
  try { return NextResponse.json({ success: true, message: await appendUserHelpMessage({ session, threadId: idResult.data, body: parsed.data.body, request }) }, { headers: noStore }); }
  catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Could not send your message." }, { status: 400, headers: noStore }); }
}
