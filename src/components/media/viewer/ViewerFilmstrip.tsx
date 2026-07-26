"use client";

import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { AlbumStatus, Media } from "@/lib/types";

interface ViewerFilmstripProps {
  media: Media[];
  item: Media;
  currentIndex: number;
  albumStatus: AlbumStatus;
  downloadAllowed: boolean;
  onSelect: (index: number) => void;
}

export function ViewerFilmstrip({ media, item, currentIndex, albumStatus, downloadAllowed, onSelect }: ViewerFilmstripProps) {
  const visibleMedia = media.slice(Math.max(0, currentIndex - 10), currentIndex + 11);
  const delivery = getMediaDeliveryDescriptor(item, { albumStatus, isAuthorized: true, downloadAllowed });

  return (
    <div className="z-20 flex min-h-[140px] flex-none flex-col items-center p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 text-center text-xs text-white/70 shadow-black drop-shadow-md">
        <span className="font-semibold text-white">{currentIndex + 1} / {media.length}</span>
        <span className="mx-2 opacity-50">|</span>
        <span className="inline-block max-w-[60vw] truncate align-bottom">
          {item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}
        </span>
      </div>

      {media.length > 1 ? (
        <label className="mb-4 flex w-full max-w-[min(42rem,calc(100vw-3rem))] items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">
          <span className="sr-only">Browse album timeline</span>
          <input type="range" min="0" max={media.length - 1} value={currentIndex} onChange={(event) => onSelect(Number(event.currentTarget.value))} className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white" aria-label="Browse album timeline" />
          <span className="min-w-10 text-right">{currentIndex + 1} / {media.length}</span>
        </label>
      ) : null}

      <div className="flex w-full max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-3 rounded-[1.2rem] border border-lightbox-border bg-white/5 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex shrink-0 items-center justify-center gap-2">
          <MediaLikeButton mediaId={item.id} />
          {downloadAllowed && delivery.downloadHref ? <DownloadButton href={delivery.downloadHref} /> : null}
        </div>
        {media.length > 1 ? (
          <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto sm:flex sm:justify-end">
            {visibleMedia.map((thumb) => {
              const index = media.findIndex((candidate) => candidate.id === thumb.id);
              const thumbDelivery = getMediaDeliveryDescriptor(thumb, { albumStatus, isAuthorized: true });
              return (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${index === currentIndex ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-100 focus-visible:opacity-100"}`}
                >
                  {thumbDelivery.card.src ? <ReliableMediaImage target={thumbDelivery.card} alt="" fill sizes="64px" className="object-cover transition-opacity duration-150" /> : <span className="flex h-full w-full items-center justify-center bg-white/5 text-[0.55rem] uppercase tracking-wider text-white/50">Unavailable</span>}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
