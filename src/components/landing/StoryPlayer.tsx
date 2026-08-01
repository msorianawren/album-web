"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PublicAdminStory } from "@/lib/types";

export function StoryPlayer({ items, initialIndex, onClose }: { items: PublicAdminStory[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const current = items[currentIndex];

  const previous = useCallback(() => {
    videoRef.current?.pause();
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const next = useCallback(() => {
    videoRef.current?.pause();
    setCurrentIndex((index) => Math.min(items.length - 1, index + 1));
  }, [items.length]);

  const close = useCallback(() => {
    videoRef.current?.pause();
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const video = videoRef.current;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      video?.pause();
      if (dialog.open) dialog.close();
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Native controls remain available when browser playback policy intervenes.
    });
  }, [current.id]);

  return (
    <dialog
      ref={dialogRef}
      className="lcb-story-dialog"
      aria-labelledby="story-dialog-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialogRef.current) close(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
      }}
    >
      <div className="lcb-story-dialog__room">
        <header className="lcb-story-dialog__topline">
          <div aria-live="polite">
            <p className="lcb-story-dialog__counter">Film {currentIndex + 1} of {items.length}</p>
            <h2 id="story-dialog-title">{current.caption || "Moving portrait"}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Close story player"><X aria-hidden="true" /></button>
        </header>

        <div className="lcb-story-dialog__screen">
          <button
            type="button"
            className="lcb-story-dialog__step"
            data-direction="previous"
            onClick={previous}
            disabled={currentIndex === 0}
            aria-label="Previous story"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <video
            key={current.id}
            ref={videoRef}
            src={current.video_url}
            poster={current.poster_url}
            controls
            playsInline
            preload="metadata"
            autoPlay
            muted
            onEnded={() => { if (currentIndex < items.length - 1) next(); }}
          />
          <button
            type="button"
            className="lcb-story-dialog__step"
            data-direction="next"
            onClick={next}
            disabled={currentIndex === items.length - 1}
            aria-label="Next story"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
