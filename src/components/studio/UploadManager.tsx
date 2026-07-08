"use client";

import { useMemo, useState } from "react";
import { RotateCcw, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Album, SiteSettings, StudioMediaItem } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

type QueueStatus = "queued" | "uploading" | "done" | "failed" | "cancelled";

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  message: string;
}

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

function queueId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function UploadManager({
  albums,
  recentMedia,
  settings,
}: {
  albums: Album[];
  recentMedia: StudioMediaItem[];
  settings: SiteSettings;
}) {
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? "");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [recent, setRecent] = useState(recentMedia);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === albumId) ?? null,
    [albumId, albums],
  );

  function validateFile(file: File) {
    const isImage = imageTypes.includes(file.type);
    const isVideo = videoTypes.includes(file.type);
    if (!isImage && !isVideo) return "Unsupported file type.";
    if (isImage && !settings.enable_image_uploads) return "Image uploads are disabled.";
    if (isVideo && !settings.enable_video_uploads) return "Video uploads are disabled.";
    if (isImage && file.size > settings.max_image_size_mb * 1024 * 1024) {
      return `Image is larger than ${settings.max_image_size_mb} MB.`;
    }
    if (isVideo && file.size > settings.max_video_size_mb * 1024 * 1024) {
      return `Video is larger than ${settings.max_video_size_mb} MB.`;
    }
    return null;
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).slice(0, settings.max_upload_files_per_batch);
    const next = incoming.map((file) => {
      const error = validateFile(file);
      return {
        id: queueId(file),
        file,
        status: error ? "failed" : "queued",
        progress: error ? 100 : 0,
        message: error ?? "Ready",
      } satisfies QueueItem;
    });
    setQueue((current) => [...next, ...current]);
    setMessage(
      `${next.length} file${next.length === 1 ? "" : "s"} added. Files are validated, metadata-stripped where supported, and optimized on the server.`,
    );
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadItem(item: QueueItem) {
    if (!albumId) {
      updateItem(item.id, { status: "failed", message: "Choose a target album first.", progress: 100 });
      return;
    }
    updateItem(item.id, { status: "uploading", message: "Validating and stripping metadata...", progress: 25 });
    const formData = new FormData();
    formData.set("albumId", albumId);
    formData.append("files", item.file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    updateItem(item.id, { progress: 80, message: "Optimizing, uploading, and saving clean metadata..." });
    const payload = await response.json();
    if (!payload.success) {
      updateItem(item.id, { status: "failed", progress: 100, message: payload.message ?? "Upload failed." });
      return;
    }
    updateItem(item.id, { status: "done", progress: 100, message: "Processed and uploaded." });
    const uploaded = (payload.data.media ?? []) as StudioMediaItem[];
    setRecent((current) => [
      ...uploaded.map((media) => ({
        ...media,
        album_title: selectedAlbum?.title ?? null,
        album_slug: selectedAlbum?.slug ?? null,
        album_status: selectedAlbum?.status ?? null,
      })),
      ...current,
    ]);
  }

  async function uploadAll() {
    const pending = queue.filter((item) => item.status === "queued" || item.status === "failed");
    if (!pending.length) {
      setMessage("No queued files to upload.");
      return;
    }
    setMessage(`Uploading ${pending.length} file${pending.length === 1 ? "" : "s"}...`);
    for (const item of pending) {
      const fresh = queue.find((queued) => queued.id === item.id);
      if (fresh?.status === "cancelled") continue;
      await uploadItem(item);
    }
    setMessage("Upload queue finished.");
  }

  function removeItem(id: string) {
    setQueue((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-text-primary">Target album</span>
            <select
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
              className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose album</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>{album.title}</option>
              ))}
            </select>
          </label>
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
            <UploadCloud className="mx-auto h-8 w-8 text-text-secondary" />
            <p className="mt-3 font-semibold text-text-primary">Drop images or videos here</p>
            <p className="mt-1 text-sm text-text-secondary">
              JPEG, PNG, WebP, AVIF, MP4, WebM, MOV. Server validation still runs after this check.
              {" "}Up to {settings.max_upload_files_per_batch} files per batch.
            </p>
            <label className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary">
              Select files
              <input
                type="file"
                multiple
                className="sr-only"
                accept={[...imageTypes, ...videoTypes].join(",")}
                onChange={(event) => event.target.files && addFiles(event.target.files)}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary" aria-live="polite">{message}</p>
          <Button onClick={uploadAll} disabled={!albumId || !queue.some((item) => item.status === "queued" || item.status === "failed")}>
            <UploadCloud className="h-4 w-4" />
            Upload queue
          </Button>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Queue</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{queue.length} file{queue.length === 1 ? "" : "s"}</h2>
          </div>
          <Button variant="secondary" onClick={() => setQueue([])}>Clear queue</Button>
        </div>
        {queue.length ? (
          <div className="mt-5 grid gap-3">
            {queue.map((item) => (
              <article key={item.id} className="grid gap-3 rounded-[1.1rem] border border-border bg-background/60 p-4 md:grid-cols-[1fr_180px_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary">{item.file.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.file.type || "unknown"} - {formatBytes(item.file.size)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-secondary">
                    <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">{item.message}</p>
                </div>
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {item.status}
                </span>
                <div className="flex justify-end gap-2">
                  <Button variant="icon" onClick={() => updateItem(item.id, { status: "queued", progress: 0, message: "Ready" })} aria-label="Retry upload">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="icon" onClick={() => removeItem(item.id)} aria-label="Remove from queue">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-dashed border-border p-8 text-center text-sm text-text-secondary">
            Queue is empty. Choose an album, then add files.
          </div>
        )}
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Recent uploads</p>
        {recent.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.slice(0, 12).map((item) => (
              <article key={item.id} className="rounded-[1.1rem] border border-border bg-background/60 p-4">
                <p className="truncate font-semibold text-text-primary">{item.title ?? item.original_filename ?? "Untitled"}</p>
                <p className="mt-1 text-xs text-text-secondary">{item.album_title ?? "Album"} - {formatBytes(item.file_size)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">No recent uploads yet.</p>
        )}
      </section>
    </div>
  );
}
