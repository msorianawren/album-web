"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  priority?: boolean;
  activation?: "always" | "interaction";
}

const SLIDE_DURATION_SECONDS = 5.8;
const MAX_ACTIVE_PREVIEWS = 3;
const activePreviews = new Map<symbol, () => void>();

function requestPreviewSlot(id: symbol, stop: () => void) {
  activePreviews.delete(id);
  activePreviews.set(id, stop);
  while (activePreviews.size > MAX_ACTIVE_PREVIEWS) {
    const oldest = activePreviews.entries().next().value as
      | [symbol, () => void]
      | undefined;
    if (!oldest) break;
    activePreviews.delete(oldest[0]);
    oldest[1]();
  }
}

function releasePreviewSlot(id: symbol) {
  activePreviews.delete(id);
}

export function LivingPreviewImages({
  images,
  title,
  sizes,
  imageClassName = "",
  priority = false,
  activation = "always",
}: LivingPreviewImagesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slotId = useRef(Symbol("living-preview"));
  const [isActive, setIsActive] = useState(activation === "always");
  const usableImages = images
    .map((image) =>
      typeof image === "string" ? createMediaDeliveryTarget(image) : image,
    )
    .filter((image) => Boolean(image.src))
    .slice(0, 4);

  const stop = useCallback(() => {
    releasePreviewSlot(slotId.current);
    if (activation === "interaction") setIsActive(false);
  }, [activation]);

  const start = useCallback(() => {
    if (activation === "always" || usableImages.length < 2) return;
    const supportsInteraction = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    ).matches;
    if (!supportsInteraction) return;
    requestPreviewSlot(slotId.current, stop);
    setIsActive(true);
  }, [activation, stop, usableImages.length]);

  useEffect(() => {
    if (activation !== "interaction") return;
    const previewId = slotId.current;
    const interactiveParent = rootRef.current?.closest<HTMLElement>(
      "a,button,[tabindex]",
    );
    if (!interactiveParent) return;
    interactiveParent.addEventListener("focus", start);
    interactiveParent.addEventListener("blur", stop);
    return () => {
      interactiveParent.removeEventListener("focus", start);
      interactiveParent.removeEventListener("blur", stop);
      releasePreviewSlot(previewId);
    };
  }, [activation, start, stop]);

  if (!usableImages.length) return null;

  const renderedImages = isActive ? usableImages : usableImages.slice(0, 1);
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
    <div
      ref={rootRef}
      className="absolute inset-0"
      data-preview-active={isActive ? "true" : "false"}
      onPointerEnter={start}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {renderedImages.map((target, index) => (
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
            loading={index === 0 && priority ? "eager" : "lazy"}
            priority={index === 0 && priority}
          />
        </div>
      ))}
    </div>
  );
}
