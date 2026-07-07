"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import type { Media } from "@/lib/types";

const MediaViewer = dynamic(
  () => import("@/components/media/MediaViewer").then((mod) => mod.MediaViewer),
  { ssr: false },
);

interface MediaGridProps {
  media: Media[];
  downloadAllowed: boolean;
}

export function MediaGrid({ media, downloadAllowed }: MediaGridProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index + 1) % media.length,
    );
  }, [media.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index - 1 + media.length) % media.length,
    );
  }, [media.length]);

  if (!media.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface/80">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          No media yet
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          Photos and videos will appear here once the owner uploads them.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12">
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {media.map((item, index) => (
          <MediaCard
            key={item.id}
            media={item}
            index={index}
            downloadAllowed={downloadAllowed}
            onOpen={setCurrentIndex}
          />
        ))}
      </div>
      <MediaViewer
        media={media}
        currentIndex={currentIndex}
        downloadAllowed={downloadAllowed}
        onClose={() => setCurrentIndex(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </section>
  );
}
