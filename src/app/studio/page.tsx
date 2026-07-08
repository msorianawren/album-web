import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, FolderPlus, MessageSquareText, Settings, UploadCloud } from "lucide-react";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { StudioStatCard } from "@/components/studio/StudioStatCard";
import { getPublicSession } from "@/lib/auth";
import { getStudioDashboardData } from "@/lib/studio-data";
import { formatBytes } from "@/lib/utils";

export default async function StudioDashboardPage() {
  const session = await getPublicSession();
  const data = await getStudioDashboardData(session);
  const metrics = data.metrics;

  const stats = [
    ["Total albums", metrics.totalAlbums, "All editorial books"],
    ["Public albums", metrics.publicAlbums, "Visible and downloadable"],
    ["Updating albums", metrics.updatingAlbums, "Visible, downloads off"],
    ["Private albums", metrics.privateAlbums, "Locked for viewers"],
    ["Total media", metrics.totalMedia, "Images and videos"],
    ["Images", metrics.totalImages, "Photo assets"],
    ["Videos", metrics.totalVideos, "Moving image assets"],
    ["Comments", metrics.totalComments, `${metrics.hiddenComments} hidden`],
    ["Likes", metrics.totalLikes, "Album and media likes"],
    ["Audit today", metrics.auditEventsToday, "Recorded user actions"],
    ["Storage estimate", formatBytes(metrics.storageBytes), "Based on indexed media"],
    ["Recent uploads", metrics.recentUploads, "Latest media loaded"],
    ["Latest update", metrics.latestAlbumUpdate ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(metrics.latestAlbumUpdate)) : "None", "Album updated date"],
  ] as const;

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Admin Studio"
        title="Dashboard"
        description="Manage albums, uploads, comments, settings, and system health from one protected workspace."
        actions={
          <>
            <QuickAction href="/studio/albums/new" icon={<FolderPlus className="h-4 w-4" />} label="Create album" />
            <QuickAction href="/studio/uploads" icon={<UploadCloud className="h-4 w-4" />} label="Upload media" />
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <StudioStatCard key={label} label={label} value={value} hint={hint} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Recent albums">
          {data.recentAlbums.length ? (
            <div className="grid gap-3">
              {data.recentAlbums.map((album) => (
                <Link key={album.id} href={`/studio/albums/${album.id}`} className="rounded-[1rem] border border-border bg-background/60 p-4 transition hover:bg-surface">
                  <p className="font-semibold text-text-primary">{album.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{album.status} - {album.media_count} media - {album.comment_count} comments</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyText>No albums yet. Create the first album to begin.</EmptyText>
          )}
        </Panel>

        <Panel title="Quick actions">
          <div className="grid gap-3">
            <QuickAction href="/studio/comments" icon={<MessageSquareText className="h-4 w-4" />} label="Moderate comments" />
            <QuickAction href="/studio/settings" icon={<Settings className="h-4 w-4" />} label="Open settings" />
            <QuickAction href="/studio/security" icon={<AlertTriangle className="h-4 w-4" />} label="Security review" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Recent media">
          {data.recentMedia.length ? (
            <div className="grid gap-3">
              {data.recentMedia.map((item) => (
                <div key={item.id} className="rounded-[1rem] border border-border bg-background/60 p-4">
                  <p className="truncate font-semibold text-text-primary">{item.title ?? item.original_filename ?? "Untitled media"}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.album_title ?? "No album"} - {item.media_type} - {formatBytes(item.file_size)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No media has been uploaded yet.</EmptyText>
          )}
        </Panel>

        <Panel title="Recent comments">
          {data.recentComments.length ? (
            <div className="grid gap-3">
              {data.recentComments.map((comment) => (
                <div key={comment.id} className="rounded-[1rem] border border-border bg-background/60 p-4">
                  <p className="line-clamp-2 text-sm text-text-primary">{comment.body}</p>
                  <p className="mt-2 text-xs text-text-secondary">{comment.author_name ?? "Anonymous"} - {comment.album_title ?? "Album"} - {comment.is_hidden ? "hidden" : "visible"}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No comments yet.</EmptyText>
          )}
        </Panel>
      </section>

      <Panel title="Recent audit activity">
        {data.recentAuditLogs.length ? (
          <div className="grid gap-3">
            {data.recentAuditLogs.map((log) => (
              <div key={log.id} className="grid gap-2 rounded-[1rem] border border-border bg-background/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary">{log.action}</p>
                  <p className="mt-1 truncate text-xs text-text-secondary">{log.actor_email ?? "anonymous/system"} - {log.path ?? log.target_type ?? "activity"}</p>
                </div>
                <p className="text-xs text-text-secondary">{formatDateTime(log.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyText>No audit activity yet.</EmptyText>
        )}
      </Panel>

      <Panel title="System warnings">
        {data.warnings.length ? (
          <div className="grid gap-2">
            {data.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-3 rounded-[1rem] border border-border bg-background/60 p-4 text-sm text-text-secondary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-text-primary" />
                {warning}
              </div>
            ))}
          </div>
        ) : (
          <EmptyText>No urgent warnings detected.</EmptyText>
        )}
      </Panel>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary transition hover:-translate-y-0.5 hover:bg-background">
      {icon}
      {label}
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="rounded-[1rem] border border-dashed border-border p-6 text-sm text-text-secondary">{children}</p>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
