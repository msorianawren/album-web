import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { createHelpThread, listUserHelpThreads, type HelpSource } from "@/lib/help-chat";
import { enforceRateLimit } from "@/lib/security-rate-limit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const createSchema = z.object({ source: z.enum(["contact", "assistant", "private_access", "system"]).default("contact"), subject: z.string().trim().min(1).max(200).optional(), body: z.string().trim().min(5).max(5000), assistantIntent: z.string().trim().max(80).optional() });

export async function GET(request: NextRequest) {
  const session = await getPublicSession(request);
  if (!session.userId) return NextResponse.json({ success: false, message: "Sign in to view conversations." }, { status: 401, headers: noStore });
  const client = await createAuthenticatedUserClient(request);
  if (!client) return NextResponse.json({ success: false, message: "Sign in to view conversations." }, { status: 401, headers: noStore });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  try { return NextResponse.json({ success: true, ...(await listUserHelpThreads(session, client, page)) }, { headers: noStore }); }
  catch { return NextResponse.json({ success: false, message: "Could not load conversations." }, { status: 500, headers: noStore }); }
}

export async function POST(request: NextRequest) {
  const session = await getPublicSession(request);
  if (!session.userId || session.isBlocked) return NextResponse.json({ success: false, message: "Sign in is required to send a message." }, { status: 403, headers: noStore });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Please enter a valid message." }, { status: 400, headers: noStore });
  const rate = await enforceRateLimit({ request, session, policy: { action: "help_thread_create", limit: 5, windowSeconds: 3600 } });
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Please wait before sending another message." }, { status: 429, headers: noStore });
  try {
    const thread = await createHelpThread({ session, source: parsed.data.source as HelpSource, subject: parsed.data.subject, body: parsed.data.body, assistantIntent: parsed.data.assistantIntent, request });
    return NextResponse.json({ success: true, thread }, { status: 201, headers: noStore });
  } catch { return NextResponse.json({ success: false, message: "Could not create the conversation." }, { status: 500, headers: noStore }); }
}
