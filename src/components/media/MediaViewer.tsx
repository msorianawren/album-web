"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { Button } from "@/components/ui/Button";
import type { Media } from "@/lib/types";

interface MediaViewerProps {
  media: Media[];
  currentIndex: number | null;
  downloadAllowed: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}

export function MediaViewer({
  media,
  currentIndex,
  downloadAllowed,
  onClose,
  onNext,
  onPrevious,
  onSelect,
}: MediaViewerProps) {
  const item = currentIndex === null ? null : media[currentIndex];
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [autoPlay, setAutoPlay] = useState(false);
  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const imageWidth = item?.width ?? 1600;
  const imageHeight = item?.height ?? 1200;
  const imageSource = item?.medium_url ?? item?.url ?? "";

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrevious();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose, onNext, onPrevious]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    if (!autoPlay) return;
    const timer = window.setInterval(onNext, item.media_type === "video" ? 9000 : 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, item, onNext]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.78)] px-3 py-16 text-accent-foreground backdrop-blur-xl sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          <Button
            variant="icon"
            className="absolute right-3 top-3 z-20 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:right-4 sm:top-4"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close media viewer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>

          <Button
            variant="icon"
            className="absolute left-3 top-3 z-20 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:left-4 sm:top-4"
            onClick={(event) => {
              event.stopPropagation();
              setAutoPlay((current) => !current);
            }}
            aria-label={autoPlay ? "Pause slideshow" : "Start slideshow"}
          >
            {autoPlay ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
          </Button>

          <Button
            variant="icon"
            className="absolute bottom-4 left-4 top-auto z-20 h-11 w-11 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:top-1/2 sm:h-12 sm:w-12 sm:-translate-y-1/2 md:left-6"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            aria-label="Previous media"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>

          <motion.div
            className="relative flex max-h-[calc(100vh-9rem)] max-w-[calc(100vw-1.5rem)] items-center justify-center md:max-w-[calc(100vw-9rem)]"
            key={item.id}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {isImageLoading ? (
              <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-lightbox-border border-t-accent-foreground" />
            ) : null}
            {item.media_type === "image" ? (
              <Image
                src={imageSource}
                alt={item.title ?? item.original_filename ?? "Album image"}
                width={imageWidth}
                height={imageHeight}
                sizes="100vw"
                className="max-h-[calc(100vh-9rem)] max-w-[calc(100vw-1.5rem)] rounded-[14px] object-contain shadow-2xl shadow-black/40 sm:rounded-[18px] md:max-w-[calc(100vw-9rem)]"
                style={{ width: "auto", height: "auto" }}
                unoptimized
                priority
                onLoad={() =>
                  setLoadedImages((current) => ({ ...current, [item.id]: true }))
                }
              />
            ) : (
              <video
                src={item.url}
                poster={item.poster_url ?? item.thumbnail_url ?? undefined}
                controls
                preload="metadata"
                className="max-h-[calc(100vh-9rem)] max-w-[calc(100vw-1.5rem)] rounded-[14px] object-contain shadow-2xl shadow-black/40 sm:rounded-[18px] md:max-w-[calc(100vw-9rem)]"
              />
            )}
          </motion.div>

          <Button
            variant="icon"
            className="absolute bottom-4 right-4 top-auto z-20 h-11 w-11 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:top-1/2 sm:h-12 sm:w-12 sm:-translate-y-1/2 md:right-6"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            aria-label="Next media"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>

          <div
            className="absolute bottom-4 left-1/2 z-20 grid max-w-[calc(100vw-7rem)] -translate-x-1/2 gap-2 rounded-[1.2rem] border border-lightbox-border bg-lightbox-control px-3 py-2 text-xs text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:bottom-5 sm:max-w-[min(50rem,calc(100vw-9rem))] sm:px-4 sm:text-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2">
              <span>
                {currentIndex! + 1} / {media.length}
              </span>
              <span className="hidden max-w-[18rem] truncate text-accent-foreground/78 sm:inline">
                {item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}
              </span>
              <MediaLikeButton mediaId={item.id} compact />
              {downloadAllowed ? (
                <DownloadButton href={`/api/media/${item.id}/download`} compact />
              ) : null}
            </div>
            {media.length > 1 ? (
              <div className="hidden max-w-full gap-2 overflow-x-auto pb-1 sm:flex">
                {media.map((thumb, index) => (
                  <button
                    key={thumb.id}
                    type="button"
                    onClick={() => onSelect(index)}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                      index === currentIndex ? "border-accent-foreground" : "border-lightbox-border opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`Open media ${index + 1}`}
                  >
                    {thumb.media_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb.thumbnail_url ?? thumb.medium_url ?? thumb.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-black/35">
                        <Play className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
