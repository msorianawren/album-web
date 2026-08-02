"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState<"play" | "pause" | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  const centerIconTimeoutRef = useRef<number | null>(null);

  // Touch gesture tracking for mobile swipe navigation & dismissal
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isPressHoldingRef = useRef(false);
  const pressHoldTimeoutRef = useRef<number | null>(null);

  const current = items[currentIndex];

  const triggerCenterIcon = useCallback((type: "play" | "pause") => {
    if (centerIconTimeoutRef.current) window.clearTimeout(centerIconTimeoutRef.current);
    setShowCenterIcon(type);
    centerIconTimeoutRef.current = window.setTimeout(() => {
      setShowCenterIcon(null);
    }, 600);
  }, []);

  const finishClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose(currentIndex);
  }, [currentIndex, onClose]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (videoRef.current) {
      videoRef.current.pause();
    }

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

  const previous = useCallback(() => {
    if (closingRef.current) return;
    videoRef.current?.pause();
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const next = useCallback(() => {
    if (closingRef.current) return;
    videoRef.current?.pause();
    if (currentIndex < items.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      close();
    }
  }, [currentIndex, items.length, close]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play()
        .then(() => {
          setIsPlaying(true);
          triggerCenterIcon("play");
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
            triggerCenterIcon("play");
          }).catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
      triggerCenterIcon("pause");
    }
  }, [triggerCenterIcon]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, []);

  const retryPlayback = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      })
      .catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
  }, []);

  // Initialize dialog modal
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      closeTimelineRef.current?.kill();
      if (centerIconTimeoutRef.current) window.clearTimeout(centerIconTimeoutRef.current);
      if (pressHoldTimeoutRef.current) window.clearTimeout(pressHoldTimeoutRef.current);
      videoRef.current?.pause();
      if (dialog.open) dialog.close();
    };
  }, []);

  // Robust Mobile-Compatible Video Playback Lifecycle
  useEffect(() => {
    onIndexChange(currentIndex);
    setHasError(false);
    setIsLoading(true);
    setProgress(0);

    const video = videoRef.current;
    if (!video) return;

    video.playsInline = true;
    video.muted = false;
    video.volume = 1;

    let isMounted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!isMounted) return;
          setIsPlaying(true);
          setIsLoading(false);
          setIsMuted(false);
        })
        .catch(() => {
          if (!isMounted) return;
          // Fallback for mobile browser autoplay policy
          video.muted = true;
          setIsMuted(true);
          video.play()
            .then(() => {
              if (isMounted) {
                setIsPlaying(true);
                setIsLoading(false);
              }
            })
            .catch(() => {
              if (isMounted) {
                setIsPlaying(false);
                setIsLoading(false);
              }
            });
        });
    }

    return () => {
      isMounted = false;
      video.pause();
    };
  }, [current.id, currentIndex, onIndexChange]);

  // Touch gesture handlers for mobile stories
  const handleTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    if (pressHoldTimeoutRef.current) window.clearTimeout(pressHoldTimeoutRef.current);
    pressHoldTimeoutRef.current = window.setTimeout(() => {
      isPressHoldingRef.current = true;
      videoRef.current?.pause();
    }, 240);
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = touch.clientX - touchStartRef.current.x;

    if (Math.hypot(deltaX, deltaY) > 12) {
      if (pressHoldTimeoutRef.current) {
        window.clearTimeout(pressHoldTimeoutRef.current);
        pressHoldTimeoutRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent) => {
    if (pressHoldTimeoutRef.current) {
      window.clearTimeout(pressHoldTimeoutRef.current);
      pressHoldTimeoutRef.current = null;
    }

    if (isPressHoldingRef.current) {
      isPressHoldingRef.current = false;
      videoRef.current?.play().catch(() => {});
      touchStartRef.current = null;
      return;
    }

    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Swipe Down or Up to close
    if (Math.abs(deltaY) > 75 && Math.abs(deltaY) > Math.abs(deltaX) * 1.3) {
      close();
      return;
    }

    // Swipe Left / Right to change story
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) next();
      else previous();
      return;
    }

    // Quick Tap: Divide screen into 3 zones (Left: Prev, Center: Toggle, Right: Next)
    if (duration < 280 && Math.hypot(deltaX, deltaY) < 15) {
      const containerRect = roomRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const tapXRatio = (touch.clientX - containerRect.left) / containerRect.width;

      if (tapXRatio < 0.28) {
        previous();
      } else if (tapXRatio > 0.72) {
        next();
      } else {
        togglePlayPause();
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="lcb-story-dialog"
      aria-labelledby="story-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
        if (event.key === " " || event.key === "k") {
          event.preventDefault();
          togglePlayPause();
        }
        if (event.key === "m") {
          event.preventDefault();
          toggleMute();
        }
      }}
    >
      <div
        ref={roomRef}
        className="lcb-story-dialog__room"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Story Progress Segments */}
        <div className="lcb-story-dialog__segments" aria-hidden="true">
          {items.map((item, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const segmentProgress = isCompleted ? 100 : isCurrent ? progress : 0;
            return (
              <div
                key={item.id}
                className="lcb-story-dialog__segment"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
              >
                <div
                  className="lcb-story-dialog__segment-fill"
                  style={{ width: `${segmentProgress}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header Bar */}
        <header className="lcb-story-dialog__topline">
          <div aria-live="polite" className="lcb-story-dialog__meta">
            <p className="lcb-story-dialog__counter">Film {currentIndex + 1} of {items.length}</p>
            <h2 id="story-dialog-title">{current.caption || "Moving portrait"}</h2>
          </div>

          <div className="lcb-story-dialog__actions">
            <button
              type="button"
              onClick={toggleMute}
              className="lcb-story-dialog__mute-btn"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={close}
              className="lcb-story-dialog__close-btn"
              aria-label="Close story player"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Video Canvas Container */}
        <div className="lcb-story-dialog__screen">
          <button
            type="button"
            className="lcb-story-dialog__step"
            data-direction="previous"
            onClick={(e) => {
              e.stopPropagation();
              previous();
            }}
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
            playsInline
            // WebKit attributes for mobile iOS WebViews
            {...{ "webkit-playsinline": "true", "x5-playsinline": "true" }}
            preload="metadata"
            autoPlay
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration && Number.isFinite(el.duration)) {
                setProgress((el.currentTime / el.duration) * 100);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              if (currentIndex < items.length - 1) {
                next();
              } else {
                close();
              }
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />

          {/* Desktop/Mouse click to play/pause overlay */}
          <div
            className="lcb-story-dialog__click-zone"
            onClick={togglePlayPause}
            aria-hidden="true"
          />

          {/* Center Play/Pause Splash Icon */}
          {showCenterIcon ? (
            <div className="lcb-story-dialog__center-icon animate-scale-fade" aria-hidden="true">
              {showCenterIcon === "play" ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}
            </div>
          ) : null}

          {/* Buffering Spinner */}
          {isLoading && !hasError ? (
            <div className="lcb-story-dialog__loading" aria-label="Loading video...">
              <Loader2 className="animate-spin" aria-hidden="true" />
            </div>
          ) : null}

          {/* Video Playback Error with Retry */}
          {hasError ? (
            <div className="lcb-story-dialog__error">
              <p>Không thể tải video</p>
              <button type="button" onClick={retryPlayback}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Thử lại
              </button>
            </div>
          ) : null}

          {/* Sound Helper Prompt on Mobile if Muted */}
          {isMuted && !isLoading && !hasError ? (
            <button
              type="button"
              className="lcb-story-dialog__unmute-badge"
              onClick={toggleMute}
              aria-label="Tap to unmute"
            >
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chạm để bật âm thanh</span>
            </button>
          ) : null}

          <button
            type="button"
            className="lcb-story-dialog__step"
            data-direction="next"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
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
