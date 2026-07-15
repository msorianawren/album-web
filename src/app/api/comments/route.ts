import { NextRequest } from "next/server";
import { getPublicSession, requireUser } from "@/lib/auth";
import { getAlbum } from "@/lib/albums";
import { logAuditEvent } from "@/lib/audit";
import { classifyDataFailure } from "@/lib/app-failure";
import {
  getCommentIpHash,
  hasDuplicateRecentComment,
  inspectCommentContent,
} from "@/lib/comment-security";
import { commentBlockReason, findBlockedCommentKeywords } from "@/lib/comment-filter";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { createPublicServerClient } from "@/lib/db/public";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { commentCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const albumId = request.nextUrl.searchParams.get("albumId");
  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!albumId) return apiError("INVALID_INPUT", "albumId is required.", 400);

  const database = await getTrustedAdminDatabase(request);
  const session = database?.session ?? await getPublicSession(request);
  const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
  const album = await getAlbum(albumId, {
    isAdmin: Boolean(session.isAdmin),
    userClient,
  });

  if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
  if (album.locked) return apiSuccess({ comments: [] });

  const readClient = userClient ?? createPublicServerClient();
  let query = readClient
    .from("comments")
    .select("*")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (mediaId) query = query.eq("media_id", mediaId);
  if (!session?.isAdmin) query = query.eq("is_hidden", false);

  const { data, error } = await query;

  if (error) {
    return toServerError(
      classifyDataFailure(error, "comments.list"),
      request,
      "api.comments.list",
    );
  }
  return apiSuccess({ comments: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session) {
      return apiError("UNAUTHENTICATED", "Login with Google is required to comment.", 401);
    }

    const parsed = commentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid comment.",
        400,
        parsed.error.flatten(),
      );
    }

    const userClient = await createAuthenticatedUserClient(request);
    const album = await getAlbum(parsed.data.albumId, {
      isAdmin: session.isAdmin,
      userClient,
    });
    if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
    if (album.locked) {
      return apiError("FORBIDDEN", "Private albums do not accept public comments.", 403);
    }

    const settings = await getSiteSettings();
    if (!settings.allow_public_comments) {
      return apiError("FORBIDDEN", "Comments are currently disabled.", 403);
    }

    if (settings.require_comment_name && !parsed.data.author_name?.trim()) {
      return apiError("INVALID_INPUT", "Please enter a name before commenting.", 400);
    }

    if (parsed.data.body.length > settings.max_comment_length) {
      return apiError("INVALID_INPUT", "Comment is longer than the configured limit.", 400);
    }

    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "create_comment",
        limit: settings.comment_rate_limit_count,
        windowSeconds: settings.comment_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many comments. Please wait before commenting again.", 429);
    }

    const scanText = `${parsed.data.author_name ?? ""}\n${parsed.data.body}`;
    const matchedKeywords = findBlockedCommentKeywords(scanText);
    if (matchedKeywords.length) {
      const reason = commentBlockReason(matchedKeywords);

      await supabase
        .from("user_profiles")
        .update({
          is_blocked: true,
          blocked_reason: reason,
          blocked_at: new Date().toISOString(),
          blocked_by: null,
        })
        .eq("user_id", session.userId);

      await logAuditEvent({
        request,
        session,
        action: "auto_block_comment_keyword",
        targetType: "user",
        targetId: session.userId ?? undefined,
        metadata: {
          albumId: parsed.data.albumId,
          mediaId: parsed.data.mediaId ?? null,
          matchedKeywords,
          deletedComment: true,
          commentPreview: parsed.data.body.slice(0, 240),
        },
      });

      return apiError(
        "COMMENT_BLOCKED",
        "This account has been blocked because the comment contained prohibited words. The comment was deleted.",
        403,
      );
    }

    const ipHash = getCommentIpHash(request);
    if (
      settings.block_duplicate_comments &&
      (await hasDuplicateRecentComment({
        session,
        ipHash,
        body: parsed.data.body,
      }))
    ) {
      await logAuditEvent({
        request,
        session,
        action: "comment_duplicate_blocked",
        targetType: "album",
        targetId: parsed.data.albumId,
        metadata: {
          mediaId: parsed.data.mediaId ?? null,
          commentPreview: parsed.data.body.slice(0, 160),
        },
      });
      return apiError("INVALID_INPUT", "This comment was already posted recently.", 400);
    }

    const moderation = inspectCommentContent(parsed.data.body, settings);
    if (moderation.status === "rejected") {
      await logAuditEvent({
        request,
        session,
        action: "comment_rejected",
        targetType: "album",
        targetId: parsed.data.albumId,
        metadata: {
          reason: moderation.reason,
          mediaId: parsed.data.mediaId ?? null,
          commentPreview: parsed.data.body.slice(0, 160),
        },
      });
      return apiError("INVALID_INPUT", moderation.reason ?? "Comment rejected.", 400);
    }

    const insertPayload = {
      album_id: parsed.data.albumId,
      media_id: parsed.data.mediaId,
      author_name: parsed.data.author_name,
      author_user_id: session.userId,
      author_email: session.email,
      ip_hash: ipHash,
      body: parsed.data.body,
      is_hidden: moderation.status === "pending",
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
    };

    let { data, error } = await supabase
      .from("comments")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      const legacyPayload = {
        album_id: parsed.data.albumId,
        media_id: parsed.data.mediaId,
        author_name: parsed.data.author_name,
        body: parsed.data.body,
        is_hidden: moderation.status === "pending",
      };
      const legacy = await supabase
        .from("comments")
        .insert(legacyPayload)
        .select("*")
        .single();
      data = legacy.data;
      error = legacy.error;
    }

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    if (moderation.status === "pending") {
      await logAuditEvent({
        request,
        session,
        action: "comment_pending_review",
        targetType: "comment",
        targetId: data.id,
        metadata: {
          albumId: parsed.data.albumId,
          reason: moderation.reason,
        },
      });
      return apiSuccess(
        {
          comment: null,
          moderationStatus: "pending",
          message: "Comment is waiting for admin review.",
        },
        { status: 202 },
      );
    }

    return apiSuccess({ comment: data, moderationStatus: "visible" }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can moderate comments.", 403);
  }
  const { client } = database;

  const body = await request.json();
  const id = String(body.id ?? "");
  const isHidden = Boolean(body.is_hidden);

  if (!id) return apiError("INVALID_INPUT", "id is required.", 400);

  const { data, error } = await client
    .from("comments")
    .update({ is_hidden: isHidden })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return toServerError(
      classifyDataFailure(error, "comments.admin_visibility"),
      request,
      "api.comments.moderate",
    );
  }
  return apiSuccess({ comment: data });
}
