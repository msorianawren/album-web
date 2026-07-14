import Image from "next/image";
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
  const usableImages = images.filter(Boolean).slice(0, 4);

  if (!usableImages.length) return null;

  const animationDuration = `${Math.max(usableImages.length, 1) * 3.2}s`;
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
          loading="eager"
          style={{
            animationDelay: `${index * 3.2}s`,
            animationDuration,
            opacity: index === 0 ? 1 : undefined,
          }}
        />
      ))}
    </>
  );
}
