import Link from "next/link";
import type { ReactNode } from "react";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { StudioStatCard } from "@/components/studio/StudioStatCard";
import { getStudioAnalyticsData } from "@/lib/studio-data";
import { formatBytes } from "@/lib/utils";

export default async function StudioAnalyticsPage() {
  const data = await getStudioAnalyticsData();
  const metrics = data.dashboard.metrics;
  const maxStatus = Math.max(metrics.publicAlbums, metrics.updatingAlbums, metrics.privateAlbums, 1);
  const maxType = Math.max(metrics.totalImages, metrics.totalVideos, 1);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Lightweight internal analytics from the existing Supabase data. No external paid analytics required."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudioStatCard label="Albums" value={metrics.totalAlbums} hint="All statuses" />
        <StudioStatCard label="Media" value={metrics.totalMedia} hint={`${metrics.totalImages} images, ${metrics.totalVideos} videos`} />
        <StudioStatCard label="Comments today" value={data.commentsToday} hint={`${data.commentsThisWeek} this week`} />
        <StudioStatCard label="Likes today" value={data.likesToday} hint={`${data.likesThisWeek} this week`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Albums by status">
          <Bar label="Public" value={metrics.publicAlbums} max={maxStatus} />
          <Bar label="Updating" value={metrics.updatingAlbums} max={maxStatus} />
          <Bar label="Private" value={metrics.privateAlbums} max={maxStatus} />
        </Panel>
        <Panel title="Media by type">
          <Bar label="Images" value={metrics.totalImages} max={maxType} />
          <Bar label="Videos" value={metrics.totalVideos} max={maxType} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Most liked albums">
          <RankedAlbums albums={data.mostLikedAlbums} metric="like_count" />
        </Panel>
        <Panel title="Most commented albums">
          <RankedAlbums albums={data.mostCommentedAlbums} metric="comment_count" />
        </Panel>
        <Panel title="Largest media files">
          <div className="grid gap-3">
            {data.largestMedia.map((item) => (
              <div key={item.id} className="rounded-[1rem] border border-border bg-background/60 p-4">
                <p className="truncate font-semibold text-text-primary">{item.title ?? item.original_filename ?? "Untitled media"}</p>
                <p className="mt-1 text-xs text-text-secondary">{formatBytes(item.file_size)} - {item.album_title ?? "No album"}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Core Web Vitals">
        <p className="text-sm leading-6 text-text-secondary">
          If Vercel Speed Insights is enabled for this project, review real visitor Core Web Vitals in the Vercel dashboard. This page keeps charts local to avoid adding bundle weight.
        </p>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-secondary">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-background">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function RankedAlbums({
  albums,
  metric,
}: {
  albums: Array<{ id: string; title: string; slug: string; like_count: number; comment_count: number }>;
  metric: "like_count" | "comment_count";
}) {
  if (!albums.length) return <p className="text-sm text-text-secondary">No album data yet.</p>;
  return (
    <div className="grid gap-3">
      {albums.map((album) => (
        <Link key={album.id} href={`/studio/albums/${album.id}`} className="rounded-[1rem] border border-border bg-background/60 p-4 transition hover:bg-surface">
          <p className="font-semibold text-text-primary">{album.title}</p>
          <p className="mt-1 text-xs text-text-secondary">{album[metric]} {metric === "like_count" ? "likes" : "comments"}</p>
        </Link>
      ))}
    </div>
  );
}
