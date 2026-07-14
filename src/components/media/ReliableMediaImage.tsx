"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MediaDeliveryTarget } from "@/lib/media/delivery";

interface ReliableMediaImageProps {
  target: MediaDeliveryTarget;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  draggable?: boolean;
  fallback?: ReactNode;
  onLoad?: () => void;
  onUnavailable?: () => void;
}

export function ReliableMediaImage(props: ReliableMediaImageProps) {
  const signature = props.target.candidates.map((candidate) => candidate.src).join("\n");
  return <ReliableMediaImageAttempt key={signature} {...props} />;
}

function ReliableMediaImageAttempt({
  target,
  alt,
  className = "",
  sizes,
  fill = false,
  width,
  height,
  priority = false,
  loading,
  draggable = false,
  fallback,
  onLoad,
  onUnavailable,
}: ReliableMediaImageProps) {
  const signature = target.candidates.map((candidate) => candidate.src).join("\n");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const current = target.candidates[candidateIndex] ?? null;
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    if (!current) onUnavailableRef.current?.();
  }, [current, signature]);

  const unavailable = fallback ?? (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-secondary px-5 text-center text-text-secondary">
      <ImageOff className="h-5 w-5 opacity-50" aria-hidden="true" />
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em]">
        Media unavailable
      </span>
    </div>
  );

  if (!current) return unavailable;

  return (
    <>
      {!loaded ? <div className="absolute inset-0 bg-surface-secondary" aria-hidden="true" /> : null}
      <Image
        key={current.src}
        src={current.src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`}
        unoptimized={current.bypassOptimization}
        priority={priority}
        loading={priority ? undefined : loading}
        draggable={draggable}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          setLoaded(false);
          setCandidateIndex((index) => index + 1);
        }}
      />
    </>
  );
}
