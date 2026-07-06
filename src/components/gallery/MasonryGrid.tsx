"use client";

import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Lightbox } from "@/components/gallery/Lightbox";
import { Button } from "@/components/ui/Button";
import type { AlbumImage } from "@/lib/types";

interface MasonryGridProps {
  images: AlbumImage[];
}

export function MasonryGrid({ images }: MasonryGridProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index + 1) % images.length,
    );
  }, [images.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index - 1 + images.length) % images.length,
    );
  }, [images.length]);

  if (!images.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          No photos yet
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          Upload JPG, PNG, WebP, HEIC, or AVIF files to start filling this
          album.
        </p>
        <Button className="mt-6">Upload photos</Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12">
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {images.map((image, index) => (
          <PhotoCard
            key={image.id}
            image={image}
            index={index}
            onOpen={setCurrentIndex}
          />
        ))}
      </div>
      <Lightbox
        images={images}
        currentIndex={currentIndex}
        onClose={() => setCurrentIndex(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </section>
  );
}
