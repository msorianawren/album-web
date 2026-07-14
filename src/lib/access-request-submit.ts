import "server-only";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { logAuditEvent } from "@/lib/audit";
import {
  accessPolicyVersion,
  getPrivateAlbumsForRequest,
  isUuid,
  normalizePhoneForReview,
  writeAccessHistory,
  type AccessRequestScope,
} from "@/lib/access-request-workflow";
import { createAdminNotification } from "@/lib/notifications";

const requestSchema = z.object({
  scope: z.enum(["selected_albums", "all_private"]).default("selected_albums"),
  albumIds: z.array(z.string().uuid()).max(100).optional().default([]),
  full_name: z.string().trim().min(2).max(120).optional(),
  requester_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(8).max(40).optional(),
  requester_phone: z.string().trim().min(8).max(40).optional(),
  reason: z.string().trim().min(10).max(1000),
  policyAccepted: z.literal(true),
  policyVersion: z.string().trim().max(40).optional(),
});

function requestAlbumIds(bodyAlbumIds: string[], fallbackAlbumId?: string | null) {
  const ids = new Set(bodyAlbumIds.filter(isUuid));
  if (fallbackAlbumId && isUuid(fallbackAlbumId)) ids.add(fallbackAlbumId);
  return Array.from(ids);
}

function hasRiskFlag(flags: Record<string, boolean>) {
  return Object.values(flags).some(Boolean);
}

export async function handleAlbumAccessRequestSubmit(request: NextRequest, fallbackAlbumId?: string | null) {
  const session = await requireUser(request);
  if (!session) {
    return apiError("UNAUTHENTICATED", "Please sign in with Google before requesting private access.", 401);
  }

  try {
    const rateLimit = await enforceRateLimit({
      request,
      session,
      policy: { action: "album_access_request", limit: 5, windowSeconds: 3600 },
    });

    if (!rateLimit.allowed) {
      return apiError("RATE_LIMITED", "Please wait before sending another access request.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Please check the request form.", 400, parsed.error.flatten());
    }

    const fullName = parsed.data.full_name ?? parsed.data.requester_name;
    const phoneInput = parsed.data.phone ?? parsed.data.requester_phone;

    if (!fullName || !phoneInput) {
      return apiError("INVALID_INPUT", "Name and phone number are required.", 400);
    }

    const phone = normalizePhoneForReview(phoneInput);
    if (!phone.ok) {
      return apiError("INVALID_INPUT", "Please enter a real phone number with a country code, for example +84 912 345 678.", 400);
    }

    const scope = parsed.data.scope as AccessRequestScope;
    const albumIds = requestAlbumIds(parsed.data.albumIds, fallbackAlbumId);
    if (scope === "selected_albums" && albumIds.length === 0) {
      return apiError("INVALID_INPUT", "Select at least one private album.", 400);
    }

    const privateAlbums = await getPrivateAlbumsForRequest(scope, albumIds);
    if (scope === "selected_albums" && privateAlbums.length !== albumIds.length) {
      return apiError("INVALID_INPUT", "Some selected albums are unavailable for private access.", 400);
    }

    const normalizedEmail = session.email?.toLowerCase() ?? null;

    let activeGrantQuery = supabase
      .from("album_access_grants")
      .select("album_id, scope, status")
      .eq("status", "active");

    activeGrantQuery = normalizedEmail
      ? activeGrantQuery.or(`user_id.eq.${session.userId},email_normalized.eq.${normalizedEmail}`)
      : activeGrantQuery.eq("user_id", session.userId);

    const { data: activeGrants } = await activeGrantQuery;

    const hasAllPrivateGrant = (activeGrants ?? []).some((grant) => grant.scope === "all_private");
    if (hasAllPrivateGrant) {
      return apiError("CONFLICT", "You already have private album access.", 409);
    }

    if (scope === "selected_albums") {
      const selectedActive = new Set(
        (activeGrants ?? [])
          .filter((grant) => grant.scope === "selected_albums" && grant.album_id)
          .map((grant) => String(grant.album_id)),
      );
      const requestableIds = albumIds.filter((albumId) => !selectedActive.has(albumId));
      if (requestableIds.length === 0) {
        return apiError("CONFLICT", "You already have access to the selected albums.", 409);
      }
    }

    const { data: pendingRequests } = await supabase
      .from("album_access_requests")
      .select("id, scope, album_id, requested_album_ids, status")
      .eq("requester_user_id", session.userId)
      .in("status", ["pending", "needs_manual_review"]);

    const hasDuplicatePending = (pendingRequests ?? []).some((row) => {
      if (scope === "all_private") return row.scope === "all_private";
      const requestedIds = new Set<string>(
        Array.isArray(row.requested_album_ids)
          ? row.requested_album_ids
          : row.album_id
            ? [String(row.album_id)]
            : [],
      );
      return albumIds.some((albumId) => requestedIds.has(albumId));
    });

    if (hasDuplicatePending) {
      return apiError("CONFLICT", "One of these albums is already under review.", 409);
    }

    const { data: priorSameUser } = await supabase
      .from("album_access_requests")
      .select("phone_hash, status")
      .eq("requester_user_id", session.userId)
      .limit(20);

    const { data: samePhoneOtherAccounts } = await supabase
      .from("album_access_requests")
      .select("requester_user_id")
      .eq("phone_hash", phone.phoneHash)
      .neq("requester_user_id", session.userId)
      .limit(3);

    let revokedGrantQuery = supabase
      .from("album_access_grants")
      .select("id")
      .eq("status", "revoked")
      .limit(1);

    revokedGrantQuery = normalizedEmail
      ? revokedGrantQuery.or(`user_id.eq.${session.userId},email_normalized.eq.${normalizedEmail}`)
      : revokedGrantQuery.eq("user_id", session.userId);

    const { data: revokedGrants } = await revokedGrantQuery;

    const riskFlags = {
      phone_changed_from_previous_requests: Boolean(
        priorSameUser?.some((row) => row.phone_hash && row.phone_hash !== phone.phoneHash),
      ),
      phone_used_by_multiple_accounts: Boolean(samePhoneOtherAccounts?.length),
      malformed_or_unusual_phone: false,
      recent_denial: Boolean(priorSameUser?.some((row) => row.status === "denied" || row.status === "rejected")),
      revoked_before: Boolean(revokedGrants?.length),
    };

    const now = new Date();
    const autoApproveAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const firstAlbumId = scope === "selected_albums" ? albumIds[0] : null;
    const status = hasRiskFlag(riskFlags) ? "needs_manual_review" : "pending";

    const { data, error } = await supabase
      .from("album_access_requests")
      .insert({
        album_id: firstAlbumId,
        requester_user_id: session.userId,
        requester_email: normalizedEmail,
        requester_name: fullName,
        full_name: fullName,
        requester_phone: phone.normalized,
        phone_normalized: phone.normalized,
        phone_hash: phone.phoneHash,
        reason: parsed.data.reason,
        scope,
        requested_album_ids: scope === "selected_albums" ? albumIds : null,
        status,
        auto_approve_at: autoApproveAt.toISOString(),
        risk_flags: riskFlags,
        policy_version: parsed.data.policyVersion ?? accessPolicyVersion,
        policy_accepted_at: now.toISOString(),
      })
      .select("id, status, scope, requested_album_ids, auto_approve_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return apiError("CONFLICT", "You already have a pending request for this album.", 409);
      }
      return apiError("SERVER_ERROR", error.message, 500);
    }

    await writeAccessHistory({
      actorUserId: session.userId,
      targetUserId: session.userId,
      targetEmail: normalizedEmail,
      action: "request_created",
      scope,
      requestId: data.id,
      albumIds: scope === "selected_albums" ? albumIds : privateAlbums.map((album) => String(album.id)),
      metadata: {
        album_count: scope === "all_private" ? privateAlbums.length : albumIds.length,
        status,
        policy_version: parsed.data.policyVersion ?? accessPolicyVersion,
        risk_flag_count: Object.values(riskFlags).filter(Boolean).length,
      },
    });

    await createAdminNotification({
      type: "admin_new_request",
      title: "New private album request",
      body:
        scope === "all_private"
          ? `${fullName} requested access to all private albums.`
          : `${fullName} requested ${albumIds.length} private album${albumIds.length > 1 ? "s" : ""}.`,
      targetUrl: "/studio/access-requests",
      metadata: { request_id: data.id, scope, album_count: scope === "all_private" ? privateAlbums.length : albumIds.length },
      request,
      actorSession: session,
    });

    await logAuditEvent({
      request,
      session,
      action: "album_access_requested",
      targetType: "album_access_request",
      targetId: data.id,
      metadata: { scope, albumCount: scope === "all_private" ? "all_private" : albumIds.length, status },
    });

    return apiSuccess({ request: data }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
