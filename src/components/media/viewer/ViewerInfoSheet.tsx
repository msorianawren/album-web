"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { Media } from "@/lib/types";

interface ViewerInfoSheetProps {
  item: Media;
  delivery: MediaDeliveryDescriptor;
  currentIndex: number;
  total: number;
  onClose: () => void;
}

export function ViewerInfoSheet({ item, delivery, currentIndex, total, onClose }: ViewerInfoSheetProps) {
  const captureDate = item.taken_at ?? item.sort_date ?? item.created_at;
  const formattedCaptureDate = captureDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: item.taken_at ? "short" : undefined }).format(new Date(captureDate))
    : null;
  const duration = item.duration_seconds === null || item.duration_seconds === undefined
    ? null
    : `${Math.floor(item.duration_seconds / 60)}:${String(Math.round(item.duration_seconds % 60)).padStart(2, "0")}`;
  const filename = item.safe_display_name ?? item.original_filename;

  return (
    <aside
      className="absolute inset-x-3 top-24 z-30 max-h-[calc(100dvh-14rem)] overflow-y-auto rounded-[1.25rem] border border-white/10 bg-black/75 p-5 text-sm text-white/75 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:top-24 sm:w-[min(23rem,calc(100vw-3rem))]"
      aria-label="Media information"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">{item.media_type === "image" ? "Artwork" : "Film"}</p>
          <p className="mt-2 text-base font-medium text-white">{item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}</p>
        </div>
        <Button variant="secondary" className="h-9 w-9 shrink-0 rounded-full border-lightbox-border bg-white/10 p-0 text-white hover:bg-white hover:text-black" onClick={onClose} aria-label="Close media information">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {item.description ? <p className="mt-4 leading-6 text-white/70">{item.description}</p> : null}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-xs">
        <div><dt className="uppercase tracking-[0.14em] text-white/40">Position</dt><dd className="mt-1 text-white/80">{currentIndex + 1} of {total}</dd></div>
        <div><dt className="uppercase tracking-[0.14em] text-white/40">Format</dt><dd className="mt-1 text-white/80">{delivery.width} × {delivery.height}</dd></div>
        <div><dt className="uppercase tracking-[0.14em] text-white/40">Type</dt><dd className="mt-1 capitalize text-white/80">{item.media_type}</dd></div>
        {formattedCaptureDate ? <div><dt className="uppercase tracking-[0.14em] text-white/40">Captured</dt><dd className="mt-1 text-white/80">{formattedCaptureDate}</dd></div> : null}
        {duration ? <div><dt className="uppercase tracking-[0.14em] text-white/40">Duration</dt><dd className="mt-1 text-white/80">{duration}</dd></div> : null}
        {filename ? <div className="col-span-2"><dt className="uppercase tracking-[0.14em] text-white/40">Filename</dt><dd className="mt-1 break-words text-white/80">{filename}</dd></div> : null}
      </dl>
    </aside>
  );
}
