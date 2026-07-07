"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Save, Star, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { AlbumDetail, AlbumStatus, Media } from "@/lib/types";
import { formatBytes, slugify } from "@/lib/utils";

function mediaPreviewUrl(item: Media) {
  return item.thumbnail_url ?? item.poster_url ?? item.medium_url ?? item.url;
}

export function AlbumEditor({ album }: { album: AlbumDetail }) {
  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [description, setDescription] = useState(album.description ?? "");
  const [status, setStatus] = useState<AlbumStatus>(album.status);
  const [coverUrl, setCoverUrl] = useState(album.cover_url ?? "");
  const [media, setMedia] = useState(album.media);
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const publicUrl = useMemo(
    () => (typeof window === "undefined" ? `/albums/${slug}` : `${window.location.origin}/albums/${slug}`),
    [slug],
  );

  async function saveAlbum() {
    setSaving(true);
    setMessage("Saving album...");
    const response = await fetch(`/api/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description: description || null,
        status,
        cover_url: coverUrl || null,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    setMessage(payload.success ? "Album saved." : payload.message ?? "Save failed.");
  }

  async function setCover(item: Media) {
    setMessage("Setting cover...");
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
    setCoverUrl(payload.data.media.thumbnail_url ?? payload.data.media.poster_url ?? payload.data.media.url);
    setMedia((current) => current.map((mediaItem) => ({ ...mediaItem, is_cover: mediaItem.id === item.id })));
    setMessage("Cover updated.");
  }

  async function deleteAlbum() {
    const typed = window.prompt(`Type "${album.title}" to delete this album.`);
    if (typed !== album.title) {
      setMessage("Delete cancelled.");
      return;
    }
    const response = await fetch(`/api/albums/${album.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Delete failed.");
      return;
    }
    window.location.href = "/studio/albums";
  }

  async function uploadMore() {
    if (!files?.length) {
      setMessage("Choose files first.");
      return;
    }
    setMessage("Uploading media...");
    const formData = new FormData();
    formData.set("albumId", album.id);
    Array.from(files).forEach((file) => formData.append("files", file));
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Upload failed.");
      return;
    }
    setMedia((current) => [...payload.data.media, ...current]);
    setFiles(null);
    setMessage(
      payload.data.failed?.length
        ? `Uploaded ${payload.data.media.length}; ${payload.data.failed.length} failed.`
        : `Uploaded ${payload.data.media.length} file${payload.data.media.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">Title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">Slug</span>
            <Input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} maxLength={120} />
          </label>
        </div>
        <label className="mt-4 grid gap-2">
          <span className="text-sm font-medium text-text-primary">Description</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
        </label>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AlbumStatus)}
              className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="private">private</option>
              <option value="updating">updating</option>
              <option value="public">public</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">Cover URL</span>
            <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-text-secondary" aria-live="polite">
            <p>{message}</p>
            <p className="mt-1 truncate">Public URL: {publicUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}>
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>
            <Link
              href={`/albums/${slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface/80 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              View
            </Link>
            <Button onClick={saveAlbum} disabled={saving}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Upload</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">Add media to this album</h2>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            <Input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
              onChange={(event) => setFiles(event.target.files)}
              className="max-w-full md:max-w-sm"
            />
            <Button onClick={uploadMore} className="w-full sm:w-auto">
              <UploadCloud className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Media</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{media.length} item{media.length === 1 ? "" : "s"}</h2>
          </div>
          <Button variant="secondary" onClick={deleteAlbum} className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4" />
            Delete album
          </Button>
        </div>
        {media.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.2rem] border border-border bg-background/60">
                <div className="aspect-[4/3] bg-surface-secondary">
                  {item.media_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaPreviewUrl(item)} alt={item.title ?? item.original_filename ?? "Album media"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={item.url} poster={item.poster_url ?? undefined} className="h-full w-full object-cover" preload="metadata" controls />
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold text-text-primary">{item.title ?? item.original_filename ?? "Untitled media"}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.media_type} - {formatBytes(item.file_size)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setCover(item)}>
                      <Star className="h-4 w-4" />
                      {item.is_cover ? "Cover" : "Set cover"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-dashed border-border p-8 text-center text-sm text-text-secondary">
            This album has no media yet.
          </div>
        )}
      </section>
    </div>
  );
}
