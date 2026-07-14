import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import {
  createMediaDeliveryTarget,
  type MediaDeliveryTarget,
} from "@/lib/media/delivery";

interface LivingPreviewImagesProps {
  images: Array<string | MediaDeliveryTarget>;
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
  const usableImages = images
    .map((image) =>
      typeof image === "string" ? createMediaDeliveryTarget(image) : image,
    )
    .filter((image) => Boolean(image.src))
    .slice(0, 4);

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
      {usableImages.map((target, index) => (
        <div
          key={`${target.src}:${index}`}
          className={`living-preview-image absolute inset-0 ${countClass}`}
          style={{
            animationDelay: `${index * SLIDE_DURATION_SECONDS - cycleDuration * 2}s`,
            animationDuration,
          }}
        >
          <ReliableMediaImage
            target={target}
            alt={index === 0 ? `${title} animated album preview` : ""}
            fill
            sizes={sizes}
            className={`object-cover transition-opacity duration-500 ${imageClassName}`}
            loading="lazy"
          />
        </div>
      ))}
    </>
  );
}
