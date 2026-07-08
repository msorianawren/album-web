import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { defaultSiteSettings, getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import type {
  Album,
  AuditLog,
  PublicSession,
  StudioCommentItem,
  StudioMediaItem,
  UserProfile,
} from "@/lib/types";
import { normalizeAlbum, normalizeMedia } from "@/lib/albums";

type UnknownRow = Record<string, unknown>;

async function countRows(table: string, column?: string, value?: string | boolean) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (column) query = query.eq(column, value);
  const { count } = await query;
  return count ?? 0;
}

async function countRowsSince(table: string, column: string, since: string) {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(column, since);
  return count ?? 0;
}

function mediaWithAlbum(row: UnknownRow): StudioMediaItem {
  const media = normalizeMedia(row);
  const album = row.albums as UnknownRow | null | undefined;
  return {
    ...media,
    album_title: typeof album?.title === "string" ? album.title : null,
    album_slug: typeof album?.slug === "string" ? album.slug : null,
    album_status: typeof album?.status === "string" ? album.status : null,
  };
}

function commentWithAlbum(row: UnknownRow): StudioCommentItem {
  const album = row.albums as UnknownRow | null | undefined;
  return {
    id: String(row.id),
    album_id: String(row.album_id),
    media_id: typeof row.media_id === "string" ? row.media_id : null,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    body: String(row.body ?? ""),
    is_hidden: Boolean(row.is_hidden),
    created_at: String(row.created_at ?? new Date().toISOString()),
    album_title: typeof album?.title === "string" ? album.title : null,
    album_slug: typeof album?.slug === "string" ? album.slug : null,
  };
}

export async function getStudioAlbums(limit = 200): Promise<Album[]> {
  noStore();
  const { data } = await supabase
    .from("albums")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => normalizeAlbum(row));
}

export async function getStudioMedia(limit = 240): Promise<StudioMediaItem[]> {
  noStore();
  const { data } = await supabase
    .from("media")
    .select(
      "id,album_id,owner_id,media_type,title,description,r2_key,url,thumbnail_url,medium_url,poster_url,width,height,duration_seconds,file_size,mime_type,original_filename,sort_order,is_cover,created_at,updated_at,albums(title, slug, status)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => mediaWithAlbum(row));
}

export async function getStudioComments(limit = 200): Promise<StudioCommentItem[]> {
  noStore();
  const { data } = await supabase
    .from("comments")
    .select("*, albums(title, slug)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => commentWithAlbum(row));
}

export async function getStudioUsersAndLogs() {
  noStore();
  const [{ data: users }, { data: logs }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return {
    users: (users ?? []) as UserProfile[],
    logs: (logs ?? []) as AuditLog[],
  };
}

export async function getStudioDashboardData(session: PublicSession) {
  noStore();
  const [
    albums,
    recentMedia,
    recentComments,
    recentAuditLogsResult,
    totalAlbums,
    publicAlbums,
    updatingAlbums,
    privateAlbums,
    totalMedia,
    totalImages,
    totalVideos,
    totalComments,
    hiddenComments,
    totalLikes,
    auditEventsToday,
  ] = await Promise.all([
    getStudioAlbums(6),
    getStudioMedia(8),
    getStudioComments(8),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    countRows("albums"),
    countRows("albums", "status", "public"),
    countRows("albums", "status", "updating"),
    countRows("albums", "status", "private"),
    countRows("media"),
    countRows("media", "media_type", "image"),
    countRows("media", "media_type", "video"),
    countRows("comments"),
    countRows("comments", "is_hidden", true),
    countRows("likes"),
    countRowsSince("audit_logs", "created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const storageBytes = recentMedia.reduce((sum, item) => sum + (item.file_size ?? 0), 0);
  const latestAlbumUpdate = albums[0]?.updated_at ?? albums[0]?.created_at ?? null;
  const warnings = [
    !process.env.DEFAULT_OWNER_ID ? "DEFAULT_OWNER_ID is missing." : null,
    !session.isAdmin ? "Current user is not the configured owner." : null,
    !process.env.R2_PUBLIC_URL ? "R2_PUBLIC_URL is not configured." : null,
    !process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY is missing." : null,
    !totalAlbums ? "No albums have been created yet." : null,
    !totalMedia ? "No media has been uploaded yet." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    metrics: {
      totalAlbums,
      publicAlbums,
      updatingAlbums,
      privateAlbums,
      totalMedia,
      totalImages,
      totalVideos,
      totalComments,
      hiddenComments,
      totalLikes,
      storageBytes,
      recentUploads: recentMedia.length,
      auditEventsToday,
      latestAlbumUpdate,
    },
    recentAlbums: albums,
    recentMedia,
    recentComments,
    recentAuditLogs: (recentAuditLogsResult.data ?? []) as AuditLog[],
    warnings,
  };
}

export async function getStudioAnalyticsData() {
  noStore();
  const [
    dashboard,
    albums,
    media,
    comments,
    auditLogsResult,
    commentsToday,
    commentsThisWeek,
    likesToday,
    likesThisWeek,
    auditToday,
    auditThisWeek,
  ] = await Promise.all([
    getStudioDashboardData({
      userId: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      isAdmin: true,
      isBlocked: false,
      blockedReason: null,
    }),
    getStudioAlbums(20),
    getStudioMedia(20),
    getStudioComments(40),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(160),
    countRowsSince("comments", "created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    countRowsSince("comments", "created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    countRowsSince("likes", "created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    countRowsSince("likes", "created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    countRowsSince("audit_logs", "created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    countRowsSince("audit_logs", "created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const largestMedia = [...media]
    .sort((left, right) => (right.file_size ?? 0) - (left.file_size ?? 0))
    .slice(0, 8);
  const mostLikedAlbums = [...albums]
    .sort((left, right) => right.like_count - left.like_count)
    .slice(0, 8);
  const mostCommentedAlbums = [...albums]
    .sort((left, right) => right.comment_count - left.comment_count)
    .slice(0, 8);
  const auditLogs = (auditLogsResult.data ?? []) as AuditLog[];
  const auditActionCounts = Object.entries(
    auditLogs.reduce<Record<string, number>>((acc, item) => {
      acc[item.action] = (acc[item.action] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
  const auditActorCounts = Object.entries(
    auditLogs.reduce<Record<string, number>>((acc, item) => {
      const actor = item.actor_email ?? "anonymous/system";
      acc[actor] = (acc[actor] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  return {
    dashboard,
    albums,
    media,
    comments,
    largestMedia,
    mostLikedAlbums,
    mostCommentedAlbums,
    auditLogs,
    auditActionCounts,
    auditActorCounts,
    auditToday,
    auditThisWeek,
    commentsToday,
    commentsThisWeek,
    likesToday,
    likesThisWeek,
  };
}

function mask(value: string | undefined) {
  if (!value) return { present: false, value: null };
  if (value.length <= 8) return { present: true, value: "****" };
  return { present: true, value: `${value.slice(0, 4)}...${value.slice(-4)}` };
}

async function tableExists(table: string) {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
  return !error;
}

export async function getSystemHealth(session?: PublicSession) {
  noStore();
  const [albums, media, comments, likes, settings] = await Promise.all([
    countRows("albums"),
    countRows("media"),
    countRows("comments"),
    countRows("likes"),
    getSiteSettings().catch(() => defaultSiteSettings),
  ]);

  const requiredTables = [
    "albums",
    "media",
    "comments",
    "likes",
    "user_profiles",
    "audit_logs",
    "security_rate_limits",
    "landing_page_settings",
    "site_settings",
  ];
  const tableChecks = await Promise.all(
    requiredTables.map(async (table) => ({ table, ok: await tableExists(table) })),
  );

  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    r2Bucket: mask(process.env.R2_BUCKET_NAME),
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? null,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      DEFAULT_OWNER_ID: Boolean(process.env.DEFAULT_OWNER_ID),
      R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID),
      R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID),
      R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY),
      R2_BUCKET_NAME: Boolean(process.env.R2_BUCKET_NAME),
      R2_PUBLIC_URL: Boolean(process.env.R2_PUBLIC_URL),
    },
    currentAdmin: session
      ? {
          isAdmin: session.isAdmin,
          userId: mask(session.userId ?? undefined),
          email: session.email,
        }
      : null,
    counts: { albums, media, comments, likes },
    tableChecks,
    settings,
    deployment: {
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
      vercelRegion: process.env.VERCEL_REGION ?? null,
    },
  };
}
