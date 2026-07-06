"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { AlbumImage } from "@/lib/types";

interface LightboxProps {
  images: AlbumImage[];
  currentIndex: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function Lightbox({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
}: LightboxProps) {
  const image = currentIndex === null ? null : images[currentIndex];

  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrevious();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose, onNext, onPrevious]);

  return (
    <AnimatePresence>
      {image ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-lightbox p-4 text-accent-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <Button
            variant="icon"
            className="absolute right-4 top-4 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onClose}
            aria-label="Close photo viewer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="icon"
            className="absolute left-4 top-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onPrevious}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>
          <motion.div
            className="relative h-[82vh] w-full max-w-6xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Image
              src={image.file_url}
              alt={image.file_name}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </motion.div>
          <Button
            variant="icon"
            className="absolute right-4 top-1/2 border-lightbox-border bg-lightbox-control text-accent-foreground"
            onClick={onNext}
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-lightbox-border bg-lightbox-control px-4 py-2 text-sm text-accent-foreground">
            {currentIndex! + 1} / {images.length}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
