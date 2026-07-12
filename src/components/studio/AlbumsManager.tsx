"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Edit3, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Album, AlbumStatus } from "@/lib/types";

const statusOptions: Array<"all" | AlbumStatus> = ["all", "public", "updating", "private"];
type AlbumSort = "newest" | "oldest" | "title" | "media";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function AlbumsManager({
  initialAlbums,
  initialSearch = "",
}: {
  initialAlbums: Album[];
  initialSearch?: string;
}) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [query, setQuery] = useState(initialSearch);
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("all");
  const [sort, setSort] = useState<AlbumSort>("newest");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleAlbums = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return albums
      .filter((album) => {
        const matchesSearch = needle
          ? `${album.title} ${album.slug} ${album.description ?? ""}`.toLowerCase().includes(needle)
          : true;
        const matchesStatus = status === "all" ? true : album.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title);
        if (sort === "media") return right.media_count - left.media_count;
        const leftDate = new Date(left.updated_at ?? left.created_at).getTime();
        const rightDate = new Date(right.updated_at ?? right.created_at).getTime();
        return sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
      });
  }, [albums, query, sort, status]);

  async function changeStatus(albumId: string, nextStatus: AlbumStatus) {
    setMessage("Updating album status...");
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Update failed.");
      return;
    }
    startTransition(() => {
      setAlbums((current) =>
        current.map((album) =>
          album.id === albumId ? { ...album, status: nextStatus, updated_at: new Date().toISOString() } : album,
        ),
      );
    });
    setMessage("Album status updated.");
  }

  async function deleteAlbum(album: Album) {
    const typed = window.prompt(`Type "${album.title}" to delete this album.`);
    if (typed !== album.title) {
      setMessage("Delete cancelled.");
      return;
    }

    setMessage("Deleting album and R2 objects...");
    const response = await fetch(`/api/albums/${album.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Delete failed.");
      return;
    }
    setAlbums((current) => current.filter((item) => item.id !== album.id));
    setMessage("Album deleted.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative">
            <span className="sr-only">Search albums</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-11"
              placeholder="Search title, slug, description"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by status"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            aria-label="Sort albums"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A-Z</option>
            <option value="media">Media count</option>
          </select>
          <Link
            href="/studio/albums/order"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary transition hover:-translate-y-0.5"
          >
            Display Order
          </Link>
          <Link
            href="/studio/albums/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground transition hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            New album
          </Link>
        </div>
        <p className="mt-3 text-sm text-text-secondary" aria-live="polite">
          {message || `${visibleAlbums.length} album${visibleAlbums.length === 1 ? "" : "s"} visible.`}
        </p>
      </div>

      {visibleAlbums.length ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-border bg-surface/82 shadow-xl shadow-text-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Album</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Media</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3">Likes</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleAlbums.map((album) => (
                  <tr key={album.id} className="border-t border-border/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-text-primary">{album.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">/{album.slug}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <AlbumStatusBadge status={album.status} />
                        <select
                          value={album.status}
                          disabled={isPending}
                          onChange={(event) => changeStatus(album.id, event.target.value as AlbumStatus)}
                          className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-primary"
                          aria-label={`Change status for ${album.title}`}
                        >
                          <option value="public">public</option>
                          <option value="updating">updating</option>
                          <option value="private">private</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {album.media_count} total - {album.photo_count} photos - {album.video_count} videos
                    </td>
                    <td className="px-4 py-4 text-text-secondary">{album.comment_count}</td>
                    <td className="px-4 py-4 text-text-secondary">{album.like_count}</td>
                    <td className="px-4 py-4 text-text-secondary">{formatDate(album.updated_at ?? album.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/albums/${album.slug}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-text-primary"
                          aria-label={`View ${album.title}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/studio/albums/${album.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-text-primary"
                          aria-label={`Edit ${album.title}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <Button variant="icon" onClick={() => deleteAlbum(album)} aria-label={`Delete ${album.title}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/70 p-10 text-center">
          <p className="text-lg font-semibold text-text-primary">No albums match this view.</p>
          <p className="mt-2 text-sm text-text-secondary">Try a different search or create a new album.</p>
        </div>
      )}
    </section>
  );
}
