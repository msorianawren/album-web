"use client";

import { useMemo, useState } from "react";
import { Copy, Eye, Grid2X2, List, Play, Search, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Album, MediaType, StudioMediaItem } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

type ViewMode = "grid" | "table";
type TypeFilter = "all" | MediaType;

function previewUrl(item: StudioMediaItem) {
  return item.thumbnail_url ?? item.poster_url ?? item.medium_url ?? item.url;
}

export function MediaLibrary({
  initialMedia,
  albums,
}: {
  initialMedia: StudioMediaItem[];
  albums: Album[];
}) {
  const [media, setMedia] = useState(initialMedia);
  const [query, setQuery] = useState("");
  const [albumId, setAlbumId] = useState("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<StudioMediaItem | null>(null);
  const [moveAlbumId, setMoveAlbumId] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return media
      .filter((item) => {
        const matchesSearch = needle
          ? `${item.title ?? ""} ${item.original_filename ?? ""} ${item.r2_key}`.toLowerCase().includes(needle)
          : true;
        const matchesAlbum = albumId === "all" ? true : item.album_id === albumId;
        const matchesType = type === "all" ? true : item.media_type === type;
        return matchesSearch && matchesAlbum && matchesType;
      })
      .sort((left, right) => {
        if (sort === "oldest") return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (sort === "size") return (right.file_size ?? 0) - (left.file_size ?? 0);
        if (sort === "type") return left.media_type.localeCompare(right.media_type);
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [albumId, media, query, sort, type]);

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectVisible() {
    const visibleIds = filtered.map((item) => item.id);
    const allVisibleSelected = visibleIds.every((id) => selected.includes(id));
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );
  }

  async function deleteMedia(id: string, confirm = true) {
    if (confirm && !window.confirm("Delete this media item from database and R2?")) return;
    const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Delete failed.");
      return;
    }
    setMedia((current) => current.filter((item) => item.id !== id));
    setSelected((current) => current.filter((item) => item !== id));
    setMessage("Media deleted.");
  }

  async function setCover(item: StudioMediaItem) {
    const response = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_cover: true }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Cover update failed.");
      return;
    }
    setMedia((current) =>
      current.map((mediaItem) =>
        mediaItem.album_id === item.album_id
          ? { ...mediaItem, is_cover: mediaItem.id === item.id }
          : mediaItem,
      ),
    );
    setMessage("Album cover updated.");
  }

  async function editMetadata(item: StudioMediaItem) {
    const nextTitle = window.prompt("New media title", item.title ?? item.original_filename ?? "");
    if (nextTitle === null) return;
    const nextDescription = window.prompt("New media description", item.description ?? "");
    if (nextDescription === null) return;
    const response = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle || null, description: nextDescription || null }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Update failed.");
      return;
    }
    setMedia((current) =>
      current.map((mediaItem) =>
        mediaItem.id === item.id
          ? { ...mediaItem, title: nextTitle || null, description: nextDescription || null }
          : mediaItem,
      ),
    );
    setMessage("Metadata saved.");
  }

  async function bulkDelete() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected media item(s)?`)) return;
    for (const id of selected) await deleteMedia(id, false);
    setMessage("Bulk delete complete.");
  }

  async function bulkMove() {
    if (!selected.length || !moveAlbumId) return;
    setMessage("Moving selected media...");
    for (const id of selected) {
      await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ album_id: moveAlbumId }),
      });
    }
    const target = albums.find((album) => album.id === moveAlbumId);
    setMedia((current) =>
      current.map((item) =>
        selected.includes(item.id)
          ? { ...item, album_id: moveAlbumId, album_title: target?.title ?? null, album_slug: target?.slug ?? null, album_status: target?.status ?? null }
          : item,
      ),
    );
    setSelected([]);
    setMessage("Selected media moved.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-11" placeholder="Search filename, title, R2 key" />
          </label>
          <select value={albumId} onChange={(event) => setAlbumId(event.target.value)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary">
            <option value="all">All albums</option>
            {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as TypeFilter)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary">
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="size">Largest</option>
            <option value="type">Type</option>
          </select>
          <div className="flex gap-2">
            <Button variant={view === "grid" ? "primary" : "secondary"} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 className="h-4 w-4" /></Button>
            <Button variant={view === "table" ? "primary" : "secondary"} onClick={() => setView("table")} aria-label="Table view"><List className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <p aria-live="polite">{message || `${filtered.length} media item${filtered.length === 1 ? "" : "s"} visible.`}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={toggleSelectVisible}>
              {filtered.length && filtered.every((item) => selected.includes(item.id)) ? "Clear visible" : "Select visible"}
            </Button>
            {selected.length ? (
              <span className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                {selected.length} selected
              </span>
            ) : null}
          </div>
          {selected.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <select value={moveAlbumId} onChange={(event) => setMoveAlbumId(event.target.value)} className="h-10 rounded-full border border-border bg-background px-3 text-xs text-text-primary">
                <option value="">Move to album...</option>
                {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
              </select>
              <Button variant="secondary" onClick={bulkMove}>Move</Button>
              <Button variant="secondary" onClick={bulkDelete}>Delete selected</Button>
            </div>
          ) : null}
        </div>
      </div>

      {filtered.length && view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[1.2rem] border border-border bg-surface/82 shadow-lg shadow-text-primary/5">
              <div className="relative aspect-[4/3] bg-surface-secondary">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggleSelected(item.id)}
                  className="absolute left-3 top-3 z-10 h-4 w-4 accent-[var(--accent)]"
                  aria-label={`Select ${item.title ?? item.original_filename ?? "media"}`}
                />
                {item.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl(item)} alt={item.title ?? item.original_filename ?? "Media"} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="relative h-full w-full">
                    <video src={item.url} poster={item.poster_url ?? undefined} className="h-full w-full object-cover" preload="metadata" />
                    <Play className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lightbox-control p-2 text-accent-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate font-semibold text-text-primary">{item.title ?? item.original_filename ?? "Untitled media"}</p>
                <p className="mt-1 truncate text-xs text-text-secondary">{item.album_title ?? "No album"} - {item.mime_type ?? item.media_type}</p>
                <p className="mt-1 truncate text-xs text-text-secondary">{formatBytes(item.file_size)} - {item.r2_key}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setPreviewItem(item)}><Eye className="h-4 w-4" />Preview</Button>
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(item.url)}><Copy className="h-4 w-4" />URL</Button>
                  <Button variant="secondary" onClick={() => setCover(item)}><Star className="h-4 w-4" />Cover</Button>
                  <Button variant="secondary" onClick={() => editMetadata(item)}>Edit</Button>
                  <Button variant="icon" onClick={() => deleteMedia(item.id)} aria-label="Delete media"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-[1.4rem] border border-border bg-surface/82 shadow-xl shadow-text-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Media</th>
                  <th className="px-4 py-3">Album</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">R2 key</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                    <td className="px-4 py-3 text-text-primary">{item.title ?? item.original_filename ?? "Untitled"}</td>
                    <td className="px-4 py-3 text-text-secondary">{item.album_title ?? "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{item.mime_type ?? item.media_type}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatBytes(item.file_size)}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-text-secondary">{item.r2_key}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCover(item)}>Cover</Button>
                        <Button variant="secondary" onClick={() => setPreviewItem(item)}>Preview</Button>
                        <Button variant="secondary" onClick={() => editMetadata(item)}>Edit</Button>
                        <Button variant="icon" onClick={() => deleteMedia(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <p className="text-lg font-semibold text-text-primary">No media matches this view.</p>
          <p className="mt-2 text-sm text-text-secondary">Upload media or clear the filters.</p>
        </div>
      )}
      {previewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-xl" onClick={() => setPreviewItem(null)}>
          <div className="relative grid max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-[1.4rem] border border-lightbox-border bg-surface shadow-2xl shadow-black/35 md:grid-cols-[1fr_20rem]" onClick={(event) => event.stopPropagation()}>
            <Button variant="icon" className="absolute right-3 top-3 z-10 bg-lightbox-control text-accent-foreground" onClick={() => setPreviewItem(null)} aria-label="Close preview">
              <X className="h-4 w-4" />
            </Button>
            <div className="flex min-h-[22rem] items-center justify-center bg-black">
              {previewItem.media_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewItem.medium_url ?? previewItem.url} alt={previewItem.title ?? previewItem.original_filename ?? "Media preview"} className="max-h-[calc(100vh-4rem)] w-full object-contain" />
              ) : (
                <video src={previewItem.url} poster={previewItem.poster_url ?? undefined} controls className="max-h-[calc(100vh-4rem)] w-full object-contain" />
              )}
            </div>
            <aside className="min-w-0 overflow-y-auto p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Media preview</p>
              <h3 className="mt-2 break-words text-xl font-semibold text-text-primary">{previewItem.title ?? previewItem.original_filename ?? "Untitled media"}</h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{previewItem.description ?? "No description."}</p>
              <div className="mt-5 grid gap-2 text-sm">
                <Meta label="Album" value={previewItem.album_title ?? "No album"} />
                <Meta label="Type" value={previewItem.mime_type ?? previewItem.media_type} />
                <Meta label="Size" value={formatBytes(previewItem.file_size)} />
                <Meta label="R2 key" value={previewItem.r2_key} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => editMetadata(previewItem)}>Edit metadata</Button>
                <Button variant="secondary" onClick={() => setCover(previewItem)}>Set cover</Button>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-border bg-background/55 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-1 break-words text-text-primary">{value}</p>
    </div>
  );
}
