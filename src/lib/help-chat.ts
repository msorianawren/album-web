import "server-only";

import type { NextRequest } from "next/server";
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

export async function listUserHelpThreads(session: PublicSession, page = 1) {
  if (!session.userId) throw new Error("Unauthorized");
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("help_threads")
    .select("id, source, status, subject, last_message_at, created_at", { count: "exact" })
    .eq("owner_user_id", session.userId)
    .order("last_message_at", { ascending: false })
    .range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { threads: (data ?? []).map(asPublicThread), total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function getUserHelpThread(session: PublicSession, threadId: string, page = 1) {
  if (!session.userId) throw new Error("Unauthorized");
  const { data: thread, error: threadError } = await supabase
    .from("help_threads")
    .select("id, source, status, subject, last_message_at, created_at")
    .eq("id", threadId)
    .eq("owner_user_id", session.userId)
    .maybeSingle();
  if (threadError) throw threadError;
  if (!thread) return null;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * HELP_PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("help_messages")
    .select("id, thread_id, sender_type, public_sender_name, public_sender_avatar_url, body, created_at", { count: "exact" })
    .eq("thread_id", threadId)
    .eq("is_internal_note", false)
    .order("created_at", { ascending: false })
    .range(from, from + HELP_PAGE_SIZE - 1);
  if (error) throw error;
  return { thread: asPublicThread(thread), messages: (data ?? []).map(asPublicMessage).reverse(), total: count ?? 0, page: safePage, pageSize: HELP_PAGE_SIZE };
}

export async function createHelpThread({ session, source, subject, body, request, assistantIntent }: { session: PublicSession; source: HelpSource; subject?: string; body: string; request?: NextRequest; assistantIntent?: string }) {
  if (!session.userId || session.isBlocked) throw new Error("Unauthorized");
  const now = new Date().toISOString();
  const { data: thread, error } = await supabase.from("help_threads").insert({
    owner_user_id: session.userId,
    owner_email: session.email,
    owner_name: session.displayName,
    source,
    subject: subject?.trim().slice(0, 200) || null,
    status: "waiting_admin",
    last_message_at: now,
    last_user_message_at: now,
  }).select("id, source, status, subject, last_message_at, created_at").single();
  if (error) throw error;
  const { error: messageError } = await supabase.from("help_messages").insert({
    thread_id: thread.id,
    sender_type: "user",
    sender_user_id: session.userId,
    public_sender_name: session.displayName || "Visitor",
    public_sender_avatar_url: null,
    body,
    body_preview: preview(body),
  });
  if (messageError) throw messageError;
  if (assistantIntent) {
    await supabase.from("help_messages").insert({
      thread_id: thread.id,
      sender_type: "system",
      public_sender_name: "Oriana Companion",
      body: "Question came from Oriana Companion.",
      body_preview: "Assistant handoff",
      metadata: { intent: assistantIntent.slice(0, 80) },
      is_internal_note: true,
    });
  }
  await createAdminNotification({ type: "admin_new_message", title: "New help conversation", body: "A visitor is waiting for Oriana Wren.", targetUrl: "/studio/messages", metadata: { thread_id: thread.id, source }, request, actorSession: session });
  await logAuditEvent({ request, session, action: "help_thread_created", targetType: "help_thread", targetId: thread.id, metadata: { source } });
  return asPublicThread(thread);
}

export async function appendUserHelpMessage({ session, threadId, body, request }: { session: PublicSession; threadId: string; body: string; request?: NextRequest }) {
  if (!session.userId || session.isBlocked) throw new Error("Unauthorized");
  const { data: thread, error: threadError } = await supabase.from("help_threads").select("id, status").eq("id", threadId).eq("owner_user_id", session.userId).maybeSingle();
  if (threadError) throw threadError;
  if (!thread) throw new Error("Not found");
  if (["closed", "archived", "blocked"].includes(thread.status)) throw new Error("This conversation is closed.");
  const { data: recent, error: recentError } = await supabase.from("help_messages").select("sender_type").eq("thread_id", threadId).eq("is_internal_note", false).order("created_at", { ascending: false }).limit(HELP_MESSAGE_LIMIT);
  if (recentError) throw recentError;
  if ((recent ?? []).length === HELP_MESSAGE_LIMIT && recent!.every((item) => item.sender_type === "user")) throw new Error("Please wait for Oriana Wren before sending more messages.");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("help_messages").insert({ thread_id: threadId, sender_type: "user", sender_user_id: session.userId, public_sender_name: session.displayName || "Visitor", body, body_preview: preview(body) }).select("id, thread_id, sender_type, public_sender_name, public_sender_avatar_url, body, created_at").single();
  if (error) throw error;
  await supabase.from("help_threads").update({ status: "waiting_admin", last_message_at: now, last_user_message_at: now, updated_at: now }).eq("id", threadId);
  await createAdminNotification({ type: "admin_new_message", title: "New help reply", body: "A visitor replied to a help conversation.", targetUrl: "/studio/messages", metadata: { thread_id: threadId }, request, actorSession: session });
  await logAuditEvent({ request, session, action: "help_message_sent", targetType: "help_thread", targetId: threadId, metadata: {} });
  return asPublicMessage(data);
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
