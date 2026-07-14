import Image from "next/image";
import { shouldBypassNextImageOptimization } from "@/lib/media/display-url";

interface LivingPreviewImagesProps {
  images: string[];
  title: string;
  sizes: string;
  imageClassName?: string;
}

const SLIDE_DURATION_SECONDS = 5.8;

export function LivingPreviewImages({
  images,
  title,
  sizes,
  imageClassName = "",
}: LivingPreviewImagesProps) {
  const usableImages = images.filter(Boolean).slice(0, 4);

  if (!usableImages.length) return null;

  const cycleDuration = Math.max(usableImages.length, 1) * SLIDE_DURATION_SECONDS;
  const animationDuration = `${cycleDuration}s`;
  const countClass =
    usableImages.length === 1
      ? "living-preview-count-1"
      : usableImages.length === 2
        ? "living-preview-count-2"
        : usableImages.length === 3
          ? "living-preview-count-3"
          : "living-preview-count-4";

  return (
    <>
      {usableImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={index === 0 ? `${title} animated album preview` : ""}
          fill
          sizes={sizes}
          className={`living-preview-image absolute inset-0 object-cover ${countClass} ${imageClassName}`}
          unoptimized={shouldBypassNextImageOptimization(src)}
          loading="lazy"
          style={{
            animationDelay: `${index * SLIDE_DURATION_SECONDS - cycleDuration * 2}s`,
            animationDuration,
          }}
        />
      ))}
    </>
  );
}
