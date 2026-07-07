"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
}

export function MediaViewer({
  media,
  currentIndex,
  downloadAllowed,
  onClose,
  onNext,
  onPrevious,
}: MediaViewerProps) {
  const item = currentIndex === null ? null : media[currentIndex];
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const imageWidth = item?.width ?? 1600;
  const imageHeight = item?.height ?? 1200;

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

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.78)] p-4 text-accent-foreground backdrop-blur-xl"
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
            className="absolute right-4 top-4 z-20 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md"
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
            className="absolute left-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md md:left-6"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            aria-label="Previous media"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>

          <motion.div
            className="relative flex max-h-[calc(100vh-7rem)] max-w-[calc(100vw-1.5rem)] items-center justify-center md:max-w-[calc(100vw-9rem)]"
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
                src={item.url}
                alt={item.title ?? item.original_filename ?? "Album image"}
                width={imageWidth}
                height={imageHeight}
                sizes="100vw"
                className="max-h-[calc(100vh-7rem)] max-w-[calc(100vw-1.5rem)] rounded-[18px] object-contain shadow-2xl shadow-black/40 md:max-w-[calc(100vw-9rem)]"
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
                className="max-h-[calc(100vh-7rem)] max-w-[calc(100vw-1.5rem)] rounded-[18px] object-contain shadow-2xl shadow-black/40 md:max-w-[calc(100vw-9rem)]"
              />
            )}
          </motion.div>

          <Button
            variant="icon"
            className="absolute right-3 top-1/2 z-20 h-12 w-12 -translate-y-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md md:right-6"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            aria-label="Next media"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>

          <div
            className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-lightbox-border bg-lightbox-control px-4 py-2 text-sm text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <span>
              {currentIndex! + 1} / {media.length}
            </span>
            <MediaLikeButton mediaId={item.id} compact />
            {downloadAllowed ? (
              <DownloadButton href={`/api/media/${item.id}/download`} compact />
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
