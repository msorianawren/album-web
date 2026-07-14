import "server-only";

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createAdminNotification, createUserNotification } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit";
import type { PublicSession } from "@/lib/types";

export const HELP_PAGE_SIZE = 20;
export const HELP_MESSAGE_LIMIT = 10;

export type HelpSource = "contact" | "assistant" | "private_access" | "system";
export type HelpStatus = "open" | "waiting_admin" | "waiting_user" | "closed" | "archived" | "blocked";
export type HelpSenderType = "user" | "assistant" | "admin" | "system";

export type PublicHelpMessage = {
  id: string;
  thread_id: string;
  sender_type: HelpSenderType;
  public_sender_name: string;
  public_sender_avatar_url: string | null;
  body: string;
  created_at: string;
};

export type PublicHelpThread = {
  id: string;
  source: HelpSource;
  status: HelpStatus;
  subject: string | null;
  last_message_at: string;
  created_at: string;
};

export type HelpWriteFailure = {
  status: number;
  message: string;
};

export function classifyHelpWriteFailure(error: unknown): HelpWriteFailure {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  switch (code) {
    case "PT400":
      return { status: 400, message: "Please enter a valid message." };
    case "PT401":
      return { status: 401, message: "Sign in is required to send a message." };
    case "PT403":
      return { status: 403, message: "You cannot send messages from this account." };
    case "PT404":
      return { status: 404, message: "Conversation not found." };
    case "PT409":
      return { status: 409, message: "This conversation is closed." };
    case "PT429":
      return { status: 429, message: "Please wait for Oriana Wren before sending more messages." };
    default:
      return { status: 503, message: "Messages are temporarily unavailable. Please try again." };
  }
}

function preview(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

function asPublicMessage(row: Record<string, unknown>): PublicHelpMessage {
  return {
    id: String(row.id),
    thread_id: String(row.thread_id),
    sender_type: row.sender_type as HelpSenderType,
    public_sender_name: row.sender_type === "admin" ? "Oriana Wren" : String(row.public_sender_name || "Oriana Wren"),
    public_sender_avatar_url: row.sender_type === "admin" ? null : typeof row.public_sender_avatar_url === "string" ? row.public_sender_avatar_url : null,
    body: String(row.body),
    created_at: String(row.created_at),
  };
}

function asPublicThread(row: Record<string, unknown>): PublicHelpThread {
  return {
    id: String(row.id),
    source: row.source as HelpSource,
    status: row.status as HelpStatus,
    subject: typeof row.subject === "string" ? row.subject : null,
    last_message_at: String(row.last_message_at),
    created_at: String(row.created_at),
  };
}

function requireRpcRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid help RPC response.");
  }
  return value as Record<string, unknown>;
}

export async function listUserHelpThreads(
  session: PublicSession,
  client: SupabaseClient,
  page = 1,
) {
  if (!session.userId) throw new Error("Unauthorized");
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  const { data, count, error } = await client
    .from("help_threads")
    .select("id, source, status, subject, last_message_at, created_at", { count: "exact" })
    .eq("owner_user_id", session.userId)
    .order("last_message_at", { ascending: false })
    .range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { threads: (data ?? []).map(asPublicThread), total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function getUserHelpThread(
  session: PublicSession,
  client: SupabaseClient,
  threadId: string,
  page = 1,
) {
  if (!session.userId) throw new Error("Unauthorized");
  const { data: thread, error: threadError } = await client
    .from("help_threads")
    .select("id, source, status, subject, last_message_at, created_at")
    .eq("id", threadId)
    .eq("owner_user_id", session.userId)
    .maybeSingle();
  if (threadError) throw threadError;
  if (!thread) return null;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  const { data, count, error } = await client
    .from("help_messages")
    .select("id, thread_id, sender_type, public_sender_name, public_sender_avatar_url, body, created_at", { count: "exact" })
    .eq("thread_id", threadId)
    .eq("is_internal_note", false)
    .order("created_at", { ascending: false })
    .range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { thread: asPublicThread(thread), messages: (data ?? []).map(asPublicMessage).reverse(), total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function createHelpThread({ session, client, source, subject, body, request, assistantIntent }: { session: PublicSession; client: SupabaseClient; source: HelpSource; subject?: string; body: string; request?: NextRequest; assistantIntent?: string }) {
  if (!session.userId || session.isBlocked) throw new Error("Unauthorized");
  const { data: thread, error } = await client
    .rpc("create_user_help_thread", {
      p_source: source,
      p_subject: subject?.trim() || null,
      p_body: body,
      p_assistant_intent: assistantIntent?.trim() || null,
    })
    .single();
  if (error) throw error;
  const threadRow = requireRpcRow(thread);
  const threadId = String(threadRow.id);
  await createAdminNotification({ type: "admin_new_message", title: "New help conversation", body: "A visitor is waiting for Oriana Wren.", targetUrl: "/studio/messages", metadata: { thread_id: threadId, source }, request, actorSession: session });
  await logAuditEvent({ request, session, action: "help_thread_created", targetType: "help_thread", targetId: threadId, metadata: { source } });
  return asPublicThread(threadRow);
}

export async function appendUserHelpMessage({ session, client, threadId, body, request }: { session: PublicSession; client: SupabaseClient; threadId: string; body: string; request?: NextRequest }) {
  if (!session.userId || session.isBlocked) throw new Error("Unauthorized");
  const { data, error } = await client
    .rpc("append_user_help_message", {
      p_thread_id: threadId,
      p_body: body,
    })
    .single();
  if (error) throw error;
  const messageRow = requireRpcRow(data);
  await createAdminNotification({ type: "admin_new_message", title: "New help reply", body: "A visitor replied to a help conversation.", targetUrl: "/studio/messages", metadata: { thread_id: threadId }, request, actorSession: session });
  await logAuditEvent({ request, session, action: "help_message_sent", targetType: "help_thread", targetId: threadId, metadata: {} });
  return asPublicMessage(messageRow);
}

export async function listAdminHelpThreads({ page = 1, status, source, query }: { page?: number; status?: HelpStatus; source?: HelpSource; query?: string }) {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  let builder = supabase.from("help_threads").select("id, owner_user_id, owner_email, owner_name, source, status, subject, last_message_at, last_user_message_at, last_admin_message_at, created_at", { count: "exact" }).order("last_message_at", { ascending: false });
  if (status) builder = builder.eq("status", status);
  if (source) builder = builder.eq("source", source);
  const text = query?.trim();
  if (text) builder = builder.or(`owner_email.ilike.%${text.replace(/[,%()]/g, "")}%,owner_name.ilike.%${text.replace(/[,%()]/g, "")}%,subject.ilike.%${text.replace(/[,%()]/g, "")}%`);
  const { data, count, error } = await builder.range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { threads: data ?? [], total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function getAdminHelpThread(threadId: string, page = 1) {
  const { data: thread, error: threadError } = await supabase.from("help_threads").select("*").eq("id", threadId).maybeSingle();
  if (threadError) throw threadError;
  if (!thread) return null;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  const { data, count, error } = await supabase.from("help_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }).range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { thread, messages: (data ?? []).reverse(), total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function appendAdminHelpMessage({ session, threadId, body, isInternalNote, request }: { session: PublicSession; threadId: string; body: string; isInternalNote?: boolean; request?: NextRequest }) {
  if (!session.isAdmin || session.isBlocked) throw new Error("Unauthorized");
  const { data: thread, error: threadError } = await supabase.from("help_threads").select("id, owner_user_id").eq("id", threadId).maybeSingle();
  if (threadError) throw threadError;
  if (!thread) throw new Error("Not found");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("help_messages").insert({
    thread_id: threadId,
    sender_type: "admin",
    sender_user_id: session.userId,
    public_sender_name: "Oriana Wren",
    public_sender_avatar_url: null,
    body,
    body_preview: preview(body),
    is_internal_note: Boolean(isInternalNote),
  }).select("id, thread_id, sender_type, public_sender_name, public_sender_avatar_url, body, created_at").single();
  if (error) throw error;
  await supabase.from("help_threads").update({ status: isInternalNote ? "waiting_admin" : "waiting_user", last_message_at: now, last_admin_message_at: now, updated_at: now, assigned_admin_id: session.userId }).eq("id", threadId);
  if (!isInternalNote && thread.owner_user_id) await createUserNotification({ recipientUserId: thread.owner_user_id, type: "message_reply", title: "Reply from Oriana Wren", body: "You have a new reply.", targetUrl: `/contact?thread=${threadId}`, metadata: { thread_id: threadId }, request, actorSession: session });
  await logAuditEvent({ request, session, action: isInternalNote ? "help_note_added" : "help_message_replied", targetType: "help_thread", targetId: threadId, metadata: {} });
  return asPublicMessage(data);
}

export async function updateHelpThreadStatus({ session, threadId, status, request }: { session: PublicSession; threadId: string; status: HelpStatus; request?: NextRequest }) {
  if (!session.isAdmin || session.isBlocked) throw new Error("Unauthorized");
  const { error } = await supabase.from("help_threads").update({ status, updated_at: new Date().toISOString() }).eq("id", threadId);
  if (error) throw error;
  await logAuditEvent({ request, session, action: "help_thread_status_updated", targetType: "help_thread", targetId: threadId, metadata: { status } });
}
