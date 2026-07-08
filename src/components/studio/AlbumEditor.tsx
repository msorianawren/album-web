"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  ExternalLink,
  ImageUp,
  Save,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useI18n } from "@/lib/i18n-client";
import { mediaSortModes, parseMediaSortMode } from "@/lib/media-sort";
import type { AlbumDetail, AlbumStatus, Media } from "@/lib/types";
import { formatBytes, slugify } from "@/lib/utils";

interface QueuedFile {
  id: string;
  file: File;
  url: string;
}

function mediaPreviewUrl(item: Media) {
  return item.thumbnail_url ?? item.poster_url ?? item.medium_url ?? item.url;
}

function queuedId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function AlbumEditor({ album }: { album: AlbumDetail }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [description, setDescription] = useState(album.description ?? "");
  const [status, setStatus] = useState<AlbumStatus>(album.status);
  const [coverUrl, setCoverUrl] = useState(album.cover_url ?? "");
  const [defaultMediaSort, setDefaultMediaSort] = useState(parseMediaSortMode(album.default_media_sort, "smart"));
  const [media, setMedia] = useState(album.media);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const queuedFilesRef = useRef<QueuedFile[]>([]);

  const publicUrl = useMemo(
    () => (typeof window === "undefined" ? `/albums/${slug}` : `${window.location.origin}/albums/${slug}`),
    [slug],
  );

  const animatedPreviewImages = useMemo(
    () =>
      [
        ...media
          .filter((item) => item.media_type === "image")
          .slice(0, 4)
          .map((item) => item.medium_url ?? item.thumbnail_url ?? item.url),
        coverUrl,
      ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).slice(0, 4),
    [coverUrl, media],
  );

  useEffect(() => {
    queuedFilesRef.current = queuedFiles;
  }, [queuedFiles]);

  useEffect(() => {
    return () => queuedFilesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  function addFiles(files: FileList | File[]) {
    const next = Array.from(files).map((file) => ({
      id: queuedId(file),
      file,
      url: URL.createObjectURL(file),
    }));
    setQueuedFiles((current) => [...next, ...current]);
    setMessage(`${next.length} file${next.length === 1 ? "" : "s"} added to upload queue.`);
  }

  function removeQueuedFile(id: string) {
    setQueuedFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearQueue() {
    queuedFiles.forEach((item) => URL.revokeObjectURL(item.url));
    setQueuedFiles([]);
  }

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
        default_media_sort: defaultMediaSort,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    setMessage(payload.success ? "Album saved." : payload.message ?? "Save failed.");
  }

  async function setCover(item: Media) {
    setMessage("Updating animated preview fallback...");
    const response = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_cover: true }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Preview update failed.");
      return;
    }
    setCoverUrl(payload.data.media.thumbnail_url ?? payload.data.media.poster_url ?? payload.data.media.url);
    setMedia((current) => current.map((mediaItem) => ({ ...mediaItem, is_cover: mediaItem.id === item.id })));
    setMessage("Animated preview fallback updated.");
  }

  async function editMedia(item: Media) {
    const nextTitle = window.prompt("Media caption/title", item.title ?? item.original_filename ?? "");
    if (nextTitle === null) return;
    const nextDescription = window.prompt("Media description / alt text", item.description ?? "");
    if (nextDescription === null) return;
    const response = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: nextTitle || null,
        description: nextDescription || null,
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Media update failed.");
      return;
    }
    setMedia((current) =>
      current.map((mediaItem) =>
        mediaItem.id === item.id
          ? { ...mediaItem, title: nextTitle || null, description: nextDescription || null }
          : mediaItem,
      ),
    );
    setMessage("Media metadata saved.");
  }

  async function toggleFeatured(item: Media) {
    const nextRank = item.featured_rank ? 0 : Math.max(Date.now() - 1_700_000_000_000, 1);
    const response = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured_rank: nextRank }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Featured update failed.");
      return;
    }
    setMedia((current) =>
      current.map((mediaItem) =>
        mediaItem.id === item.id ? { ...mediaItem, featured_rank: nextRank } : mediaItem,
      ),
    );
    setMessage(nextRank ? "Media marked as featured." : "Media removed from featured order.");
  }

  async function deleteMedia(item: Media) {
    if (!window.confirm(`Remove "${item.title ?? item.original_filename ?? "this media"}" from this album and R2?`)) return;
    const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Media delete failed.");
      return;
    }
    setMedia((current) => current.filter((mediaItem) => mediaItem.id !== item.id));
    setMessage("Media removed.");
  }

  async function persistOrder(nextMedia: Media[]) {
    setMessage("Saving media order...");
    await Promise.all(
      nextMedia.map((item, index) =>
        fetch(`/api/media/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: index }),
        }),
      ),
    );
    setMessage("Media order saved.");
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const reordered = next.map((mediaItem, sort_order) => ({ ...mediaItem, sort_order }));
    setMedia(reordered);
    persistOrder(reordered);
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
    if (!queuedFiles.length) {
      setMessage("Choose files first.");
      return;
    }
    setUploading(true);
    setMessage("Uploading media...");
    const formData = new FormData();
    formData.set("albumId", album.id);
    queuedFiles.forEach((item) => formData.append("files", item.file));
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();
    setUploading(false);
    if (!payload.success) {
      setMessage(payload.message ?? "Upload failed.");
      return;
    }
    setMedia((current) => [...payload.data.media, ...current]);
    clearQueue();
    setMessage(
      payload.data.failed?.length
        ? `Uploaded ${payload.data.media.length}; ${payload.data.failed.length} failed.`
        : `Uploaded ${payload.data.media.length} file${payload.data.media.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{t("studio.albumInfo")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{t("studio.identity")}</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-primary">{t("studio.title")}</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-primary">{t("studio.slug")}</span>
              <Input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} maxLength={120} />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">{t("studio.description")}</span>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          </label>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-text-primary">{t("studio.visibility")}</span>
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
              <span className="text-sm font-medium text-text-primary">{t("studio.previewFallback")}</span>
              <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="Fallback image URL" />
            </label>
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-medium text-text-primary">{t("studio.defaultSort")}</span>
              <select
                value={defaultMediaSort}
                onChange={(event) => setDefaultMediaSort(parseMediaSortMode(event.target.value))}
                className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
              >
                {mediaSortModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`sort.${mode}`)}
                  </option>
                ))}
              </select>
              <span className="text-xs leading-5 text-text-secondary">
                {t("studio.defaultSortHelp")}
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}>
              <Copy className="h-4 w-4" />
              {t("studio.copyUrl")}
            </Button>
            <Link
              href={`/albums/${slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface/80 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              {t("studio.view")}
            </Link>
            <Link
              href="/studio/albums"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface/80 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary"
            >
              {t("studio.back")}
            </Link>
            <Button onClick={saveAlbum} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving" : t("studio.saveAlbum")}
            </Button>
          </div>
          <div className="text-sm text-text-secondary" aria-live="polite">
            <p>{message}</p>
            <p className="mt-1 break-words">Public URL: {publicUrl}</p>
          </div>
        </div>

        <aside className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{t("studio.animatedPreview")}</p>
          <div className="living-preview-frame relative mt-3 aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-border bg-surface-secondary shadow-2xl shadow-text-primary/10">
            {animatedPreviewImages.length ? (
              animatedPreviewImages.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={index === 0 ? `${title} animated preview` : ""}
                  className="living-preview-image absolute inset-0 h-full w-full object-cover"
                  style={{
                    animationDelay: `${index * 3.2}s`,
                    opacity: index === 0 ? 1 : undefined,
                  }}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              ))
            ) : (
              <div className="living-preview-placeholder flex h-full w-full items-center justify-center">
                <ImageUp className="h-10 w-10 text-text-secondary" aria-hidden="true" />
              </div>
            )}
            <div className="living-preview-light" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            The public album card automatically uses the first images in this album. The fallback URL keeps older albums working.
          </p>
        </aside>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{t("studio.uploadQueue")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">Add multiple images or videos</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Preview files before uploading, remove mistakes, then publish them into this album.
            </p>
          </div>
          <div
            className={`rounded-[1.4rem] border border-dashed p-6 text-center transition ${
              dragOver ? "border-accent bg-background" : "border-border bg-background/55"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-text-secondary" aria-hidden="true" />
            <p className="mt-3 font-semibold text-text-primary">Drop files here</p>
            <p className="mt-1 text-sm text-text-secondary">JPEG, PNG, WebP, AVIF, MP4, WebM, MOV.</p>
            <label className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary">
              Select files
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                onChange={(event) => event.target.files && addFiles(event.target.files)}
                className="sr-only"
              />
            </label>
          </div>
        </div>
        {queuedFiles.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {queuedFiles.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.1rem] border border-border bg-background/60">
                <div className="aspect-[4/3] bg-surface-secondary">
                  {item.file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.url} className="h-full w-full object-cover" controls preload="metadata" />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.file.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{formatBytes(item.file.size)}</p>
                  <Button variant="secondary" className="mt-3 w-full" onClick={() => removeQueuedFile(item.id)}>
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={clearQueue} disabled={!queuedFiles.length || uploading}>
            Clear queue
          </Button>
          <Button onClick={uploadMore} disabled={!queuedFiles.length || uploading}>
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Uploading" : "Upload queue"}
          </Button>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{t("studio.imageManagement")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{media.length} item{media.length === 1 ? "" : "s"}</h2>
          </div>
          <Button variant="secondary" onClick={deleteAlbum} className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4" />
            {t("studio.deleteAlbum")}
          </Button>
        </div>
        {media.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((item, index) => (
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
                  <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{item.description ?? "No caption or alt text yet."}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface/70 p-3 text-xs text-text-secondary">
                    <div>
                      <dt className="font-semibold text-text-primary">Taken</dt>
                      <dd>{item.taken_at ? new Date(item.taken_at).toLocaleDateString() : "Upload date"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-text-primary">Shape</dt>
                      <dd>{item.orientation ?? "unknown"}{item.aspect_ratio ? ` ${item.aspect_ratio.toFixed(2)}` : ""}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-text-primary">Engagement</dt>
                      <dd>{item.like_count ?? 0} likes / {item.comment_count ?? 0} comments</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-text-primary">Metadata</dt>
                      <dd>{item.metadata_status ?? "fallback"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setCover(item)}>
                      <Star className="h-4 w-4" />
                      {item.is_cover ? "Preview fallback" : "Set preview"}
                    </Button>
                    <Button variant="secondary" onClick={() => toggleFeatured(item)}>
                      <Sparkles className="h-4 w-4" />
                      {item.featured_rank ? t("studio.featured") : t("studio.feature")}
                    </Button>
                    <Button variant="secondary" onClick={() => editMedia(item)}>
                      <Edit3 className="h-4 w-4" />
                      {t("studio.edit")}
                    </Button>
                    <Button variant="icon" onClick={() => moveMedia(index, -1)} disabled={index === 0} aria-label="Move media up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="icon" onClick={() => moveMedia(index, 1)} disabled={index === media.length - 1} aria-label="Move media down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="icon" onClick={() => deleteMedia(item)} aria-label="Remove media">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-dashed border-border p-8 text-center text-sm text-text-secondary">
            This album has no media yet. Add files above to start the living preview and gallery.
          </div>
        )}
      </section>
    </div>
  );
}
