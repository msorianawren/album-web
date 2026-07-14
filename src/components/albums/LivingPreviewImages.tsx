"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { shouldBypassNextImageOptimization } from "@/lib/media/display-url";

interface LivingPreviewImagesProps {
  images: string[];
  title: string;
  sizes: string;
  imageClassName?: string;
}

export function LivingPreviewImages({
  images,
  title,
  sizes,
  imageClassName = "",
}: LivingPreviewImagesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());

  const usableImages = useMemo(
    () => images.filter((src) => src && !failedSources.has(src)),
    [failedSources, images],
  );

  useEffect(() => {
    if (usableImages.length <= 1) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % usableImages.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [usableImages.length]);

  if (!usableImages.length) return null;

  const currentIndex = activeIndex % usableImages.length;

  return (
    <>
      {usableImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={index === 0 ? `${title} animated album preview` : ""}
          fill
          sizes={sizes}
          className={`absolute inset-0 object-cover transition-[opacity,transform,filter] duration-700 ease-out ${imageClassName}`}
          unoptimized={shouldBypassNextImageOptimization(src)}
          loading="eager"
          style={{
            opacity: index === currentIndex ? 1 : 0,
            transform: index === currentIndex ? "scale(1.045)" : "scale(1.075)",
            zIndex: index === currentIndex ? 2 : 1,
          }}
          onError={() => {
            setFailedSources((current) => {
              const next = new Set(current);
              next.add(src);
              return next;
            });
          }}
        />
      ))}
    </>
  );
}
