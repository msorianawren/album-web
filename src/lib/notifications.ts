import "server-only";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import type { PublicSession } from "@/lib/types";

export const notificationTypes = [
  "album_access_granted",
  "album_access_revoked",
  "access_request_approved",
  "access_request_rejected",
  "message_reply",
  "account_blocked",
  "account_unblocked",
  "admin_new_request",
  "admin_new_message",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

type NotificationMetadata = Record<string, string | number | boolean | null | undefined>;

type NotificationInput = {
  recipientUserId: string | null | undefined;
  type: NotificationType;
  title: string;
  body?: string | null;
  targetUrl?: string | null;
  metadata?: NotificationMetadata;
  request?: NextRequest;
  actorSession?: PublicSession;
};

type AlbumNoticeInfo = {
  id: string;
  title?: string | null;
  slug?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const typeAllowlist = new Set<string>(notificationTypes);

function isUuid(value: string | null | undefined) {
  return typeof value === "string" && uuidPattern.test(value);
}

function cleanText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeTargetUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return trimmed.slice(0, 300);
}

function safeMetadata(metadata: NotificationMetadata | undefined) {
  if (!metadata) return null;
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    clean[key.slice(0, 60)] = typeof value === "string" ? value.slice(0, 300) : value;
  }
  const serialized = JSON.stringify(clean);
  return serialized.length > 2000 ? null : clean;
}

async function writeNotificationAudit(
  action: "notification_created" | "notification_create_failed",
  input: NotificationInput,
  result: Record<string, unknown>,
) {
  if (!input.actorSession) return;
  try {
    await logAuditEvent({
      request: input.request,
      session: input.actorSession,
      action,
      targetType: "notification",
      targetId: input.recipientUserId ?? "missing-recipient",
      metadata: {
        type: input.type,
        ...result,
      },
    });
  } catch (error) {
    console.warn("Notification audit failed", error);
  }
}

export async function createUserNotification(input: NotificationInput) {
  if (!isUuid(input.recipientUserId)) {
    console.warn("Notification skipped: missing or invalid recipient user id", {
      type: input.type,
    });
    await writeNotificationAudit("notification_create_failed", input, {
      reason: "missing_or_invalid_recipient",
    });
    return { ok: false as const, reason: "missing_or_invalid_recipient" };
  }

  if (!typeAllowlist.has(input.type)) {
    await writeNotificationAudit("notification_create_failed", input, {
      reason: "invalid_type",
    });
    return { ok: false as const, reason: "invalid_type" };
  }

  const payload = {
    recipient_user_id: input.recipientUserId,
    type: input.type,
    title: cleanText(input.title, 120),
    body: input.body ? cleanText(input.body, 500) : null,
    target_url: safeTargetUrl(input.targetUrl),
    status: "unread",
    metadata: safeMetadata(input.metadata),
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.warn("Notification insert failed", {
      type: input.type,
      recipientUserId: input.recipientUserId,
      message: error.message,
    });
    await writeNotificationAudit("notification_create_failed", input, {
      reason: error.message,
    });
    return { ok: false as const, reason: error.message };
  }

  await writeNotificationAudit("notification_created", input, {
    notification_id: data.id,
  });

  return { ok: true as const, id: data.id as string };
}

export async function getActiveAdminRecipientIds() {
  const ownerId = process.env.DEFAULT_OWNER_ID;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, role, is_blocked")
    .or(ownerId ? `role.in.(admin,founder),user_id.eq.${ownerId}` : "role.in.(admin,founder)")
    .eq("is_blocked", false);

  if (error) {
    console.warn("Admin notification recipient lookup failed", error.message);
    return ownerId && isUuid(ownerId) ? [ownerId] : [];
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (isUuid(row.user_id)) ids.add(row.user_id);
  }
  if (ownerId && isUuid(ownerId)) ids.add(ownerId);
  return Array.from(ids);
}

export async function createAdminNotification(
  input: Omit<NotificationInput, "recipientUserId">,
) {
  const recipients = await getActiveAdminRecipientIds();
  const results = await Promise.all(
    recipients.map((recipientUserId) =>
      createUserNotification({ ...input, recipientUserId }),
    ),
  );
  return {
    ok: results.some((result) => result.ok),
    recipientCount: recipients.length,
    results,
  };
}

function albumTarget(album: Pick<AlbumNoticeInfo, "slug"> | null | undefined) {
  return album?.slug ? `/albums/${album.slug}` : "/albums";
}

function albumTitle(album: Pick<AlbumNoticeInfo, "title"> | null | undefined) {
  return album?.title?.trim() || "this private album";
}

export async function createAccessRequestApprovedNotification({
  recipientUserId,
  album,
  requestId,
  request,
  actorSession,
}: {
  recipientUserId: string | null | undefined;
  album: AlbumNoticeInfo | null;
  requestId: string;
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  return createUserNotification({
    recipientUserId,
    type: "access_request_approved",
    title: "Private access approved",
    body: `You can now view "${albumTitle(album)}".`,
    targetUrl: albumTarget(album),
    metadata: { album_id: album?.id ?? null, request_id: requestId },
    request,
    actorSession,
  });
}

export async function createAccessRequestRejectedNotification({
  recipientUserId,
  album,
  requestId,
  request,
  actorSession,
}: {
  recipientUserId: string | null | undefined;
  album: AlbumNoticeInfo | null;
  requestId: string;
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  return createUserNotification({
    recipientUserId,
    type: "access_request_rejected",
    title: "Private access request not approved",
    body: `Your request for "${albumTitle(album)}" was not approved.`,
    targetUrl: albumTarget(album),
    metadata: { album_id: album?.id ?? null, request_id: requestId },
    request,
    actorSession,
  });
}

export async function createAccessGrantedNotification({
  recipientUserId,
  scope,
  albums,
  request,
  actorSession,
}: {
  recipientUserId: string | null | undefined;
  scope: "all_private" | "selected_albums";
  albums?: AlbumNoticeInfo[];
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  const albumCount = albums?.length ?? 0;
  const singleAlbum = scope === "selected_albums" && albumCount === 1 ? albums?.[0] : null;

  return createUserNotification({
    recipientUserId,
    type: "album_access_granted",
    title: scope === "all_private" ? "Private archive access granted" : "Private access granted",
    body:
      scope === "all_private"
        ? "You can now view all available private albums."
        : singleAlbum
          ? `You can now view "${albumTitle(singleAlbum)}".`
          : `You can now view ${albumCount} private albums.`,
    targetUrl: singleAlbum ? albumTarget(singleAlbum) : "/albums",
    metadata: {
      scope,
      album_count: albumCount,
      album_id: singleAlbum?.id ?? null,
    },
    request,
    actorSession,
  });
}

export async function createAccessRevokedNotification({
  recipientUserId,
  scope,
  albums,
  request,
  actorSession,
}: {
  recipientUserId: string | null | undefined;
  scope: "all_private" | "selected_albums";
  albums?: AlbumNoticeInfo[];
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  const albumCount = albums?.length ?? 0;
  const singleAlbum = scope === "selected_albums" && albumCount === 1 ? albums?.[0] : null;

  return createUserNotification({
    recipientUserId,
    type: "album_access_revoked",
    title: scope === "all_private" ? "Private archive access removed" : "Private access removed",
    body:
      scope === "all_private"
        ? "Your access to private albums has been removed."
        : singleAlbum
          ? `Access to "${albumTitle(singleAlbum)}" has been removed.`
          : `Access to ${albumCount || "selected"} private albums has been removed.`,
    targetUrl: "/albums",
    metadata: {
      scope,
      album_count: albumCount,
      album_id: singleAlbum?.id ?? null,
    },
    request,
    actorSession,
  });
}

export async function createMessageReplyNotification(input: {
  recipientUserId: string | null | undefined;
  messageId: string;
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    type: "message_reply",
    title: "Reply from Oriana Wren",
    body: "You have a new reply in Contact.",
    targetUrl: "/contact",
    metadata: { message_id: input.messageId },
    request: input.request,
    actorSession: input.actorSession,
  });
}

export async function createAccountBlockedNotification(input: {
  recipientUserId: string | null | undefined;
  reason?: string | null;
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    type: "account_blocked",
    title: "Account access restricted",
    body: input.reason || "Your account access has been restricted by the admin.",
    targetUrl: "/boycott",
    metadata: { reason: input.reason ?? null },
    request: input.request,
    actorSession: input.actorSession,
  });
}

export async function createAccountUnblockedNotification(input: {
  recipientUserId: string | null | undefined;
  request?: NextRequest;
  actorSession?: PublicSession;
}) {
  return createUserNotification({
    recipientUserId: input.recipientUserId,
    type: "account_unblocked",
    title: "Account access restored",
    body: "Your account can access Oriana Wren albums again.",
    targetUrl: "/albums",
    request: input.request,
    actorSession: input.actorSession,
  });
}

export async function fetchAlbumsForNotifications(albumIds: string[] | undefined) {
  const ids = Array.from(new Set((albumIds ?? []).filter(isUuid)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("albums")
    .select("id, title, slug")
    .in("id", ids);

  if (error) {
    console.warn("Notification album lookup failed", error.message);
    return [];
  }

  return (data ?? []) as AlbumNoticeInfo[];
}
