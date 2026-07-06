"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect } from "react";
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

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-lightbox p-4 text-accent-foreground"
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
            className="absolute right-4 top-4 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onClose}
            aria-label="Close media viewer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>

          <Button
            variant="icon"
            className="absolute left-4 top-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onPrevious}
            aria-label="Previous media"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>

          <motion.div
            className="relative flex h-[82vh] w-full max-w-6xl items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {item.media_type === "image" ? (
              <Image
                src={item.url}
                alt={item.title ?? item.original_filename ?? "Album image"}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            ) : (
              <video
                src={item.url}
                poster={item.poster_url ?? item.thumbnail_url ?? undefined}
                controls
                preload="metadata"
                className="max-h-full max-w-full rounded-2xl"
              />
            )}
          </motion.div>

          <Button
            variant="icon"
            className="absolute right-4 top-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onNext}
            aria-label="Next media"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-lightbox-border bg-lightbox-control px-4 py-2 text-sm text-accent-foreground">
            <span>
              {currentIndex! + 1} / {media.length}
            </span>
            {downloadAllowed ? (
              <a
                href={item.url}
                download
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </a>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
