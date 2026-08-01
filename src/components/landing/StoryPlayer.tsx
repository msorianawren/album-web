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
        <div className="lcb-story-dialog__screen">
          <video
            key={current.id}
            ref={videoRef}
            src={current.video_url}
            poster={current.poster_url}
            controls
            playsInline
            preload="metadata"
          />
        </div>

        <aside className="lcb-story-dialog__notes">
          <div className="lcb-story-dialog__topline">
            <p>Founder Stories</p>
            <button type="button" onClick={close} aria-label="Close story player"><X aria-hidden="true" /></button>
          </div>
          <div>
            <p className="lcb-story-dialog__counter">Film {currentIndex + 1} of {items.length}</p>
            <h2 id="story-dialog-title">{current.caption || "Moving portrait"}</h2>
          </div>
          <div className="lcb-story-dialog__navigation">
            <button type="button" onClick={previous} disabled={currentIndex === 0}><ChevronLeft aria-hidden="true" /> Previous</button>
            <button type="button" onClick={next} disabled={currentIndex === items.length - 1}>Next <ChevronRight aria-hidden="true" /></button>
          </div>
        </aside>
      </div>
    </dialog>
  );
}
