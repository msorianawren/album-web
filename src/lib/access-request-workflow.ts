import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import {
  createAccessGrantedNotification,
  createAccessRequestRejectedNotification,
  fetchAlbumsForNotifications,
} from "@/lib/notifications";
import type { PublicSession } from "@/lib/types";

export const accessPolicyVersion = "2026-07-14";

export type AccessRequestScope = "selected_albums" | "all_private";
export type AccessRequestDecision = "approved" | "denied" | "auto_approved" | "needs_manual_review";

type AccessRequestRow = {
  id: string;
  album_id?: string | null;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name?: string | null;
  full_name?: string | null;
  phone_normalized?: string | null;
  reason: string | null;
  scope?: AccessRequestScope | null;
  status: string;
  requested_album_ids?: string[] | null;
};

type GrantInsert = {
  user_id: string | null;
  email_normalized: string | null;
  scope: AccessRequestScope;
  album_id: string | null;
  status: "active";
  granted_by: string | null;
  note?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phoneAllowedPattern = /^[+\d\s().-]+$/;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function normalizePhoneForReview(input: string) {
  const raw = input.replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 40 || !phoneAllowedPattern.test(raw)) {
    return { ok: false as const, normalized: "", phoneHash: "", riskFlags: ["malformed_or_unusual_phone"] };
  }

  const hasLeadingPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false as const, normalized: "", phoneHash: "", riskFlags: ["malformed_or_unusual_phone"] };
  }

  const normalized = `${hasLeadingPlus ? "+" : ""}${digits}`;
  const secret =
    process.env.PHONE_HASH_SECRET ??
    process.env.IP_HASH_SALT ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "album-web";
  const phoneHash = createHash("sha256").update(`${secret}:${normalized}`).digest("hex");
  return { ok: true as const, normalized, phoneHash, riskFlags: [] as string[] };
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const visible = phone.slice(-3);
  return `${"*".repeat(Math.max(4, phone.length - 3))}${visible}`;
}

export function resolveRequestedAlbumIds(row: Pick<AccessRequestRow, "album_id" | "requested_album_ids" | "scope">) {
  if (row.scope === "all_private") return [];
  const ids = Array.isArray(row.requested_album_ids) ? row.requested_album_ids.filter(isUuid) : [];
  if (ids.length) return Array.from(new Set(ids));
  return isUuid(row.album_id) ? [row.album_id] : [];
}

export async function getPrivateAlbumsForRequest(scope: AccessRequestScope, albumIds: string[]) {
  let query = supabase
    .from("albums")
    .select("id,title,slug,status,deleted_at")
    .eq("status", "private")
    .is("deleted_at", null);

  if (scope === "selected_albums") {
    query = query.in("id", albumIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function writeAccessHistory(input: {
  actorUserId: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  action: string;
  scope?: AccessRequestScope | null;
  requestId?: string | null;
  grantId?: string | null;
  albumIds?: string[];
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("album_access_history").insert({
    actor_user_id: input.actorUserId,
    target_user_id: input.targetUserId,
    target_email: input.targetEmail?.toLowerCase() ?? null,
    action: input.action,
    scope: input.scope ?? null,
    request_id: input.requestId ?? null,
    grant_id: input.grantId ?? null,
    album_ids: input.albumIds?.length ? input.albumIds : null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function insertGrant(payload: GrantInsert) {
  const { data, error } = await supabase
    .from("album_access_grants")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }

  return data?.id as string | null;
}

export async function decideAccessRequest({
  requestId,
  decision,
  actorSession,
  note,
  request,
  system = false,
}: {
  requestId: string;
  decision: AccessRequestDecision;
  actorSession: PublicSession;
  note?: string | null;
  request?: NextRequest;
  system?: boolean;
}) {
  const { data: requestRecord, error: fetchError } = await supabase
    .from("album_access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !requestRecord) {
    return { ok: false as const, status: "not_found", message: "Request not found." };
  }

  const row = requestRecord as AccessRequestRow;
  if (!["pending", "needs_manual_review"].includes(row.status)) {
    return { ok: true as const, status: "skipped", request: row };
  }

  const scope = row.scope === "all_private" ? "all_private" : "selected_albums";
  const requestedAlbumIds = resolveRequestedAlbumIds(row);

  if (scope === "selected_albums" && requestedAlbumIds.length === 0) {
    await supabase
      .from("album_access_requests")
      .update({
        status: "needs_manual_review",
        review_note: "No valid private album IDs were found.",
        admin_note: "No valid private album IDs were found.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    return { ok: false as const, status: "needs_manual_review", message: "No valid album IDs." };
  }

  const finalStatus = decision === "approved" || decision === "auto_approved" ? decision : decision === "needs_manual_review" ? "needs_manual_review" : "denied";
  const actorUserId = system ? null : actorSession.userId;
  const now = new Date().toISOString();

  if (decision === "approved" || decision === "auto_approved") {
    const albums = await getPrivateAlbumsForRequest(scope, requestedAlbumIds);
    const availableAlbumIds = albums.map((album) => String(album.id));

    if (scope === "selected_albums" && availableAlbumIds.length === 0) {
      await supabase
        .from("album_access_requests")
        .update({
          status: "needs_manual_review",
          review_note: "Requested albums are unavailable.",
          admin_note: "Requested albums are unavailable.",
          updated_at: now,
        })
        .eq("id", requestId);
      return { ok: false as const, status: "needs_manual_review", message: "Requested albums unavailable." };
    }

    const grantIds: string[] = [];
    if (scope === "all_private") {
      const grantId = await insertGrant({
        user_id: row.requester_user_id,
        email_normalized: row.requester_email?.toLowerCase() ?? null,
        scope: "all_private",
        album_id: null,
        status: "active",
        granted_by: actorUserId,
        note: note ?? null,
      });
      if (grantId) grantIds.push(grantId);
    } else {
      for (const albumId of availableAlbumIds) {
        const grantId = await insertGrant({
          user_id: row.requester_user_id,
          email_normalized: row.requester_email?.toLowerCase() ?? null,
          scope: "selected_albums",
          album_id: albumId,
          status: "active",
          granted_by: actorUserId,
          note: note ?? null,
        });
        if (grantId) grantIds.push(grantId);
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("album_access_requests")
      .update({
        status: finalStatus,
        reviewed_by: actorUserId,
        reviewed_at: now,
        review_note: note ?? null,
        admin_note: note ?? null,
        auto_approved_at: decision === "auto_approved" ? now : null,
        updated_at: now,
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    await writeAccessHistory({
      actorUserId,
      targetUserId: row.requester_user_id,
      targetEmail: row.requester_email,
      action: decision === "auto_approved" ? "request_auto_approved" : "request_approved",
      scope,
      requestId,
      albumIds: scope === "all_private" ? availableAlbumIds : requestedAlbumIds,
      reason: note ?? null,
      metadata: { grant_ids: grantIds, source: system ? "cron" : "admin" },
    });

    await createAccessGrantedNotification({
      recipientUserId: row.requester_user_id,
      scope,
      albums: scope === "all_private" ? undefined : await fetchAlbumsForNotifications(availableAlbumIds),
      request,
      actorSession,
    });

    await logAuditEvent({
      request,
      session: actorSession,
      action: decision === "auto_approved" ? "album_access_auto_approved" : "album_access_approved",
      targetType: "album_access_request",
      targetId: requestId,
      metadata: { scope, albumCount: scope === "all_private" ? "all_private" : availableAlbumIds.length },
    });

    return { ok: true as const, status: finalStatus, request: updated };
  }

  const { data: updated, error: updateError } = await supabase
    .from("album_access_requests")
    .update({
      status: finalStatus,
      reviewed_by: actorUserId,
      reviewed_at: now,
      review_note: note ?? null,
      admin_note: note ?? null,
      updated_at: now,
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);

  await writeAccessHistory({
    actorUserId,
    targetUserId: row.requester_user_id,
    targetEmail: row.requester_email,
    action: finalStatus === "needs_manual_review" ? "request_needs_manual_review" : "request_denied",
    scope,
    requestId,
    albumIds: requestedAlbumIds,
    reason: note ?? null,
  });

  if (finalStatus === "denied") {
    const albums = requestedAlbumIds.length ? await fetchAlbumsForNotifications(requestedAlbumIds) : [];
    await createAccessRequestRejectedNotification({
      recipientUserId: row.requester_user_id,
      album: albums[0] ?? null,
      requestId,
      request,
      actorSession,
    });
  }

  await logAuditEvent({
    request,
    session: actorSession,
    action: finalStatus === "needs_manual_review" ? "album_access_needs_manual_review" : "album_access_denied",
    targetType: "album_access_request",
    targetId: requestId,
    metadata: { scope, albumCount: requestedAlbumIds.length },
  });

  return { ok: true as const, status: finalStatus, request: updated };
}
