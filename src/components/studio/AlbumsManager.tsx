"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Edit3, ExternalLink, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Album, AlbumStatus } from "@/lib/types";

const statusOptions: Array<"all" | AlbumStatus | "trash"> = ["all", "public", "updating", "private", "trash"];
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleAlbums = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return albums
      .filter((album) => {
        const matchesSearch = needle
          ? `${album.title} ${album.slug} ${album.description ?? ""}`.toLowerCase().includes(needle)
          : true;

        if (status === "trash") {
          return matchesSearch && Boolean(album.deleted_at);
        }

        // Active statuses ("all", "public", "updating", "private") exclude soft-deleted items
        const isNotDeleted = !album.deleted_at;
        const matchesStatus = status === "all" ? true : album.status === status;
        return matchesSearch && isNotDeleted && matchesStatus;
      })
      .sort((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title);
        if (sort === "media") return right.media_count - left.media_count;
        const leftDate = new Date(left.updated_at ?? left.created_at).getTime();
        const rightDate = new Date(right.updated_at ?? right.created_at).getTime();
        return sort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
      });
  }, [albums, query, sort, status]);

  const allVisibleSelected = useMemo(() => {
    if (!visibleAlbums.length) return false;
    return visibleAlbums.every((a) => selectedIds.has(a.id));
  }, [visibleAlbums, selectedIds]);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(current);
      visibleAlbums.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function changeStatus(albumId: string, nextStatus: AlbumStatus) {
    setMessage("Updating album status...");
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Status update failed.");
      return;
    }
    startTransition(() => {
      setAlbums((current) =>
        current.map((album) =>
          album.id === albumId ? { ...album, ...payload.data.album, updated_at: new Date().toISOString() } : album,
        ),
      );
    });
    setMessage("Status updated.");
  }

  async function deleteAlbum(album: Album, permanent = false) {
    if (permanent) {
      const typed = window.prompt(`Type "${album.title}" to permanently delete this album and all its R2 media files.`);
      if (typed !== album.title) {
        setMessage("Permanent delete cancelled.");
        return;
      }
    } else {
      const confirmDelete = window.confirm(`Move "${album.title}" to Trash?`);
      if (!confirmDelete) return;
    }

    setMessage(permanent ? "Permanently purging album and R2 files..." : "Moving album to trash...");
    const url = permanent ? `/api/albums/${album.id}?permanent=true` : `/api/albums/${album.id}`;
    const response = await fetch(url, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Delete failed.");
      return;
    }

    setAlbums((current) =>
      permanent
        ? current.filter((item) => item.id !== album.id)
        : current.map((item) =>
            item.id === album.id ? { ...item, deleted_at: new Date().toISOString() } : item,
          ),
    );
    setMessage(permanent ? "Album permanently purged." : "Album moved to trash.");
  }

  async function restoreAlbum(album: Album) {
    setMessage("Restoring album...");
    const response = await fetch("/api/studio/albums/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", ids: [album.id] }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Restore failed.");
      return;
    }
    setAlbums((current) =>
      current.map((item) => (item.id === album.id ? { ...item, deleted_at: null } : item)),
    );
    setMessage("Album restored.");
  }

  async function handleBulkAction(action: "soft_delete" | "restore" | "permanent_delete") {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if (action === "permanent_delete") {
      const typed = window.prompt(`Type "DELETE ALL" to permanently purge ${ids.length} album(s) and all associated media from R2.`);
      if (typed !== "DELETE ALL") {
        setMessage("Bulk permanent delete cancelled.");
        return;
      }
    }

    setMessage(`Executing bulk ${action.replace("_", " ")} for ${ids.length} album(s)...`);
    const response = await fetch("/api/studio/albums/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Bulk operation failed.");
      return;
    }

    setAlbums((current) => {
      if (action === "permanent_delete") {
        return current.filter((item) => !selectedIds.has(item.id));
      }
      if (action === "soft_delete") {
        return current.map((item) =>
          selectedIds.has(item.id) ? { ...item, deleted_at: new Date().toISOString() } : item,
        );
      }
      if (action === "restore") {
        return current.map((item) =>
          selectedIds.has(item.id) ? { ...item, deleted_at: null } : item,
        );
      }
      return current;
    });

    setSelectedIds(new Set());
    setMessage(`Successfully completed bulk ${action.replace("_", " ")}.`);
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
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
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setSelectedIds(new Set());
            }}
            className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by status"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All active albums" : option === "trash" ? "Trash / Hidden" : option}
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary pr-2">
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">
              {selectedIds.size}
            </span>
            <span>album{selectedIds.size === 1 ? "" : "s"} selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status === "trash" ? (
              <>
                <Button variant="secondary" onClick={() => handleBulkAction("restore")}>
                  <RotateCcw className="h-4 w-4" />
                  Restore selected
                </Button>
                <Button variant="secondary" className="border-red-500/40 text-red-500 hover:bg-red-500/10" onClick={() => handleBulkAction("permanent_delete")}>
                  <Trash2 className="h-4 w-4" />
                  Permanent delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => handleBulkAction("soft_delete")}>
                  <Trash2 className="h-4 w-4" />
                  Move to Trash
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAction("restore")}>
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
                <Button variant="secondary" className="border-red-500/40 text-red-500 hover:bg-red-500/10" onClick={() => handleBulkAction("permanent_delete")}>
                  <Trash2 className="h-4 w-4" />
                  Permanent delete
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {visibleAlbums.length ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-border bg-surface/82 shadow-xl shadow-text-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-[var(--accent)] rounded cursor-pointer"
                      aria-label="Select all visible albums"
                    />
                  </th>
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
                {visibleAlbums.map((album) => {
                  const isSelected = selectedIds.has(album.id);
                  const isDeleted = Boolean(album.deleted_at);

                  return (
                    <tr
                      key={album.id}
                      className={`border-t border-border/70 transition-colors ${
                        isSelected ? "bg-accent/10" : isDeleted ? "bg-surface/40 opacity-75" : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(album.id)}
                          className="h-4 w-4 accent-[var(--accent)] rounded cursor-pointer"
                          aria-label={`Select ${album.title}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-text-primary">{album.title}</p>
                        <p className="mt-1 text-xs text-text-secondary">/{album.slug}</p>
                        {isDeleted && (
                          <p className="mt-1 text-[0.68rem] italic text-red-400">
                            Deleted: {formatDate(album.deleted_at ?? undefined)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <AlbumStatusBadge status={isDeleted ? "private" : album.status} />
                          {!isDeleted && (
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
                          )}
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
                          {!isDeleted ? (
                            <>
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
                              <Button variant="icon" onClick={() => deleteAlbum(album, false)} aria-label={`Move ${album.title} to trash`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" onClick={() => restoreAlbum(album)} aria-label={`Restore ${album.title}`}>
                                <RotateCcw className="h-4 w-4" />
                                Restore
                              </Button>
                              <Button variant="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => deleteAlbum(album, true)} aria-label={`Permanently delete ${album.title}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/70 p-10 text-center">
          <p className="text-lg font-semibold text-text-primary">No albums match this view.</p>
          <p className="mt-2 text-sm text-text-secondary">
            {status === "trash" ? "Trash is currently empty." : "Try a different search or create a new album."}
          </p>
        </div>
      )}
    </section>
  );
}
