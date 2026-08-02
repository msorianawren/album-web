"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { gsap } from "gsap";
import type { PublicAdminStory } from "@/lib/types";

export function StoryPlayer({
  items,
  initialIndex,
  onClose,
  onIndexChange,
  getReturnTarget,
}: {
  items: PublicAdminStory[];
  initialIndex: number;
  onClose: (index: number) => void;
  onIndexChange: (index: number) => void;
  getReturnTarget: (index: number) => HTMLElement | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  const current = items[currentIndex];

  const previous = useCallback(() => {
    if (closingRef.current) return;
    videoRef.current?.pause();
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const next = useCallback(() => {
    if (closingRef.current) return;
    videoRef.current?.pause();
    setCurrentIndex((index) => Math.min(items.length - 1, index + 1));
  }, [items.length]);

  const finishClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose(currentIndex);
  }, [currentIndex, onClose]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    videoRef.current?.pause();

    const dialog = dialogRef.current;
    const room = roomRef.current;
    const target = getReturnTarget(currentIndex);

    if (!dialog || !room || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }

    const roomRect = room.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (roomRect.width <= 0 || roomRect.height <= 0 || targetRect.width <= 0 || targetRect.height <= 0) {
      finishClose();
      return;
    }

    const x = targetRect.left + targetRect.width / 2 - (roomRect.left + roomRect.width / 2);
    const y = targetRect.top + targetRect.height / 2 - (roomRect.top + roomRect.height / 2);

    closeTimelineRef.current?.kill();
    gsap.set(room, { transformOrigin: "center center", willChange: "transform, opacity" });
    closeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        gsap.set(room, { clearProps: "transform,opacity,visibility,willChange" });
        finishClose();
      },
    }).to(room, {
      x,
      y,
      scaleX: targetRect.width / roomRect.width,
      scaleY: targetRect.height / roomRect.height,
      autoAlpha: 0.08,
      duration: 0.42,
      ease: "power2.in",
      overwrite: "auto",
    });
  }, [currentIndex, finishClose, getReturnTarget]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // showModal() must run before video can be fetched by Safari iOS.
    // requestAnimationFrame ensures the dialog is visible and painted before
    // React mounts the video element on the next render cycle.
    dialog.showModal();
    return () => {
      closeTimelineRef.current?.kill();
      videoRef.current?.pause();
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    onIndexChange(currentIndex);
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    // Defer play() by one task so the dialog is fully painted and Safari
    // does not immediately suspend the media element.
    const id = window.setTimeout(() => {
      void video.play().catch(() => {
        // Unmuted autoplay blocked (iOS Safari policy) → retry muted.
        // Native controls remain so the user can unmute manually.
        video.muted = true;
        void video.play().catch(() => {});
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [current.id, currentIndex, onIndexChange]);

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
      <div ref={roomRef} className="lcb-story-dialog__room">
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
            // webkit-playsinline is required for inline playback in iOS Safari WebViews
            {...({ "webkit-playsinline": "true" } as Record<string, string>)}
            preload="auto"
            autoPlay
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
