"use client";

import { useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { Album, SiteSettings, StudioMediaItem } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { UnifiedUploadPanel } from "./uploads/UnifiedUploadPanel";

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
  const [recent, setRecent] = useState(recentMedia);
  const [message, setMessage] = useState("");

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === albumId) ?? null,
    [albumId, albums],
  );

  const {
    queue,
    isUploading,
    addFiles,
    removeFile,
    clearCompleted,
    clearQueue,
    cancelFile,
    retryFile,
    uploadAll,
    cancelRemaining,
  } = useUploadQueue(settings);

  function handleUploadAll() {
    if (!albumId) {
      setMessage("Please choose a target album first.");
      return;
    }
    setMessage("Uploading to " + selectedAlbum?.title + "...");
    uploadAll(albumId, (media) => {
      setRecent((current) => [
        {
          ...media,
          album_title: selectedAlbum?.title ?? null,
          album_slug: selectedAlbum?.slug ?? null,
          album_status: selectedAlbum?.status ?? null,
        },
        ...current,
      ]);
    }).then(() => {
      setMessage("Upload queue finished.");
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <label className="grid gap-2 flex-1 max-w-sm">
            <span className="text-sm font-medium text-text-primary">Target album</span>
            <select
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
              disabled={isUploading}
              className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Choose album</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>{album.title}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
             <p className="text-sm text-text-secondary" aria-live="polite">{message}</p>
             <Button onClick={handleUploadAll} disabled={!albumId || isUploading || !queue.some((item) => item.status === "queued" || item.status === "failed")}>
               <UploadCloud className="h-4 w-4" />
               {isUploading ? "Uploading..." : "Upload queue"}
             </Button>
          </div>
        </div>

        <UnifiedUploadPanel
          queue={queue}
          isUploading={isUploading}
          addFiles={addFiles}
          removeFile={removeFile}
          clearCompleted={clearCompleted}
          clearQueue={clearQueue}
          cancelFile={cancelFile}
          retryFile={retryFile}
          cancelRemaining={cancelRemaining}
          settings={settings}
          title="Batch upload to album"
          description="Select an album above, add multiple files here, then click Upload Queue."
        />
      </section>

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Recent uploads</p>
        {recent.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.slice(0, 12).map((item) => (
              <article key={item.id} className="rounded-[1.1rem] border border-border bg-background/60 p-4 flex gap-3">
                <div className="relative h-12 w-12 shrink-0 bg-surface-secondary rounded overflow-hidden">
                   <ReliableMediaImage
                     target={getMediaDeliveryDescriptor(item, { albumStatus: item.album_status === "private" ? "private" : "public" }).card}
                     alt=""
                     fill
                     sizes="48px"
                     className="object-cover transition-opacity duration-150"
                   />
                </div>
                <div className="min-w-0">
                   <p className="truncate font-semibold text-text-primary text-sm">{item.title ?? item.original_filename ?? "Untitled"}</p>
                   <p className="mt-1 text-xs text-text-secondary truncate">{item.album_title ?? "Album"} - {formatBytes(item.file_size)}</p>
                </div>
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
