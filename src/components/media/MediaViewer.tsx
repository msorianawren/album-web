"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { Button } from "@/components/ui/Button";
import { ViewerBackdrop } from "@/components/media/viewer/ViewerBackdrop";
import { ViewerFilmstrip } from "@/components/media/viewer/ViewerFilmstrip";
import { ViewerInfoSheet } from "@/components/media/viewer/ViewerInfoSheet";
import { ViewerTopBar } from "@/components/media/viewer/ViewerTopBar";
import {
  ORIANA_MEDIA_VIEWER_ACTIVE_EVENT,
  ORIANA_MEDIA_VIEWER_CLOSE_EVENT,
  ORIANA_MEDIA_VIEWER_IDLE_EVENT,
  ORIANA_MEDIA_VIEWER_OPEN_EVENT,
  ORIANA_MEDIA_VIEWER_STATE_EVENT,
} from "@/lib/assistant/runtime-events";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import { cinematicDrift, slideshowInterval } from "@/lib/media/cinematic-drift";
import type { AlbumStatus, Media } from "@/lib/types";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import { useViewerDelivery } from "@/hooks/media-viewer/useViewerDelivery";
import { useViewerGestures } from "@/hooks/media-viewer/useViewerGestures";
import { useViewerMachine } from "@/hooks/media-viewer/useViewerMachine";

interface MediaViewerProps {
  media: Media[];
  currentIndex: number | null;
  downloadAllowed: boolean;
  albumStatus: AlbumStatus;
  protectAssets?: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}

function backdropHue(blurhash: string | null | undefined) {
  return [...(blurhash ?? "oriana")].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 360, 0);
}

export function MediaViewer({
  media,
  currentIndex,
  downloadAllowed,
  albumStatus,
  protectAssets = false,
  onClose,
  onNext,
  onPrevious,
  onSelect,
}: MediaViewerProps) {
  const item = currentIndex === null ? null : media[currentIndex];
  const {
    loadedImages, setLoadedImages,
    failedVideos, setFailedVideos,
    autoPlay, setAutoPlay,
    slideshowPace, setSlideshowPace,
    preferencesReady, setPreferencesReady,
    pageHidden, setPageHidden,
    scale, setScale,
    translate, setTranslate,
    isFullscreen, setIsFullscreen,
    controlsVisible, setControlsVisible,
    infoOpen, setInfoOpen,
    transitionDirection, setTransitionDirection,
  } = useViewerMachine();
  const controlsTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { isClient, markAlbumViewed, getAlbumViewState, saveViewerPreferences } = useAlbumViewMemory();

  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const delivery = item
    ? getMediaDeliveryDescriptor(item, {
        albumStatus,
        isAuthorized: true,
        downloadAllowed,
      })
    : null;
  const { target: viewerTarget, prefetch } = useViewerDelivery({
    mediaId: item?.id,
    privateAlbum: albumStatus === "private",
    fallback: delivery?.viewer ?? { src: null, candidates: [] },
    scale,
    isVideo: item?.media_type === "video",
  });
  const ambientHue = backdropHue(delivery?.blurhash);
  const drift = item ? cinematicDrift(item.id) : null;
  const driftEnabled = Boolean(autoPlay && slideshowPace !== "still" && item?.media_type === "image" && !reducedMotion);
  const controlsVisibleRef = useRef(controlsVisible);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;
  }, [controlsVisible]);

  const revealControls = useCallback(() => {
    if (!controlsVisibleRef.current) setControlsVisible(true);
  }, [setControlsVisible]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [setScale, setTranslate]);

  const toggleFullscreen = useCallback(() => {
    setControlsVisible(true);
    if (document.fullscreenElement === containerRef.current) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    void containerRef.current?.requestFullscreen().catch(() => {});
  }, [setControlsVisible]);

  const navigate = useCallback((direction: -1 | 1, manual = true) => {
    if (manual) setAutoPlay(false);
    resetZoom();
    setTransitionDirection(direction);
    if (direction === 1) onNext();
    else onPrevious();
    setInfoOpen(false);
    setControlsVisible(true);
  }, [onNext, onPrevious, resetZoom, setAutoPlay, setControlsVisible, setInfoOpen, setTransitionDirection]);

  const selectMedia = useCallback((index: number) => {
    setAutoPlay(false);
    resetZoom();
    setTransitionDirection(index >= (currentIndex ?? 0) ? 1 : -1);
    onSelect(index);
  }, [currentIndex, onSelect, resetZoom, setAutoPlay, setTransitionDirection]);

  const handleImageLoad = useCallback(() => {
    if (!item || currentIndex === null) return;
    setLoadedImages((current) => ({ ...current, [item.id]: true }));
    const next = media[(currentIndex + 1) % media.length];
    if (next) prefetch(next.id, next.media_type === "video");
  }, [currentIndex, item, media, prefetch, setLoadedImages]);

  const handleImageUnavailable = useCallback(() => {
    if (item) setLoadedImages((current) => ({ ...current, [item.id]: true }));
  }, [item, setLoadedImages]);

  const { isPanning, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, zoomAt } = useViewerGestures({
    stageRef,
    scale,
    translate,
    onTransform: ({ scale: nextScale, translate: nextTranslate }) => {
      setScale(nextScale);
      setTranslate(nextTranslate);
    },
    onNext: () => navigate(1),
    onPrevious: () => navigate(-1),
    onClose,
    onOpenInfo: () => {
      setAutoPlay(false);
      setInfoOpen(true);
      setControlsVisible(true);
    },
    onToggleFullscreen: toggleFullscreen,
    onInteraction: () => setControlsVisible(true),
    onZoom: () => setAutoPlay(false),
  });

  useEffect(() => {
    const resetTimer = window.setTimeout(resetZoom, 0);
    if (item) {
      markAlbumViewed({
        albumId: item.album_id,
        slug: "",
        mediaId: item.id,
        mediaIndex: currentIndex!,
      });
    }
    return () => window.clearTimeout(resetTimer);
  }, [currentIndex, item, markAlbumViewed, resetZoom]);

  useEffect(() => {
    if (!item || !isClient) return;
    const restoreTimer = window.setTimeout(() => {
      const savedPace = getAlbumViewState(item.album_id).record?.slideshowPace;
      if (savedPace === "still" || savedPace === "slow" || savedPace === "cinema") setSlideshowPace(savedPace);
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [getAlbumViewState, isClient, item, setPreferencesReady, setSlideshowPace]);

  useEffect(() => {
    if (!item || !preferencesReady) return;
    saveViewerPreferences({
      albumId: item.album_id,
      slideshowPace,
      controlsPreference: "auto",
    });
  }, [item, preferencesReady, saveViewerPreferences, slideshowPace]);

  useEffect(() => {
    if (!item || !controlsVisible) return;
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && containerRef.current?.contains(active) && active.matches("button, input, select, textarea")) return;
      if (!infoOpen) setControlsVisible(false);
    }, 1800);
    return () => {
      if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    };
  }, [controlsVisible, infoOpen, item, setControlsVisible]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      if (!active) resetZoom();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [resetZoom, setIsFullscreen]);

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      if (event.key === "Escape" || event.key.toLowerCase() === "g") {
        if (document.fullscreenElement === containerRef.current) {
          event.preventDefault();
          void document.exitFullscreen().catch(() => {});
          return;
        }
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") navigate(1);
      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === " ") { event.preventDefault(); navigate(event.shiftKey ? -1 : 1); }
      if (event.key.toLowerCase() === "f") toggleFullscreen();
      if (event.key.toLowerCase() === "h") setControlsVisible((visible) => !visible);
      if (event.key.toLowerCase() === "i") setInfoOpen((open) => !open);
      if (event.key.toLowerCase() === "s") setAutoPlay((active) => !active);
      if (event.key === "=" || event.key === "+") zoomAt(Math.min(scale + 0.5, 5));
      if (event.key === "-") zoomAt(Math.max(scale - 0.5, 1));
      if (event.key === "0") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, navigate, onClose, resetZoom, scale, setAutoPlay, setControlsVisible, setInfoOpen, toggleFullscreen, zoomAt]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  useEffect(() => {
    const updateVisibility = () => setPageHidden(document.visibilityState === "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [setPageHidden]);

  useEffect(() => {
    if (item) {
      document.body.dataset.orianaMediaViewerOpen = "true";
      window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_OPEN_EVENT));
    }
    else delete document.body.dataset.orianaMediaViewerOpen;
    window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_STATE_EVENT));

    return () => {
      delete document.body.dataset.orianaMediaViewerOpen;
      window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_CLOSE_EVENT));
      window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_STATE_EVENT));
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    window.dispatchEvent(new Event(controlsVisible ? ORIANA_MEDIA_VIEWER_ACTIVE_EVENT : ORIANA_MEDIA_VIEWER_IDLE_EVENT));
  }, [controlsVisible, item]);

  useEffect(() => {
    if (!item || !autoPlay || pageHidden || scale > 1 || infoOpen) return;
    const timer = window.setInterval(() => navigate(1, false), slideshowInterval(slideshowPace, item.media_type === "video"));
    return () => window.clearInterval(timer);
  }, [autoPlay, infoOpen, item, navigate, pageHidden, scale, slideshowPace]);

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const nextScale = Math.min(Math.max(1, scale - event.deltaY * 0.005), 5);
    setAutoPlay(false);
    zoomAt(nextScale, { x: event.clientX, y: event.clientY });
    setControlsVisible(true);
  };

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          ref={containerRef}
          className="media-viewer-shell fixed inset-0 z-50 flex min-h-[100dvh] flex-col overflow-hidden bg-[#060608] text-accent-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onPointerMove={revealControls}
        >
          <ViewerBackdrop hue={ambientHue} />
          {controlsVisible ? (
            <div data-viewer-chrome="top" className="absolute inset-x-0 top-0 z-20">
              <ViewerTopBar
                autoPlay={autoPlay}
                slideshowPace={slideshowPace}
                scale={scale}
                isFullscreen={isFullscreen}
                infoOpen={infoOpen}
                onToggleAutoplay={() => setAutoPlay((current) => !current)}
                onCyclePace={() => setSlideshowPace((pace) => pace === "still" ? "slow" : pace === "slow" ? "cinema" : "still")}
                onResetZoom={resetZoom}
                onToggleFullscreen={toggleFullscreen}
                onToggleInfo={() => { setAutoPlay(false); setInfoOpen((open) => !open); }}
                onClose={onClose}
              />
            </div>
          ) : null}

          <div
            ref={stageRef}
            data-viewer-stage
            className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden ${isFullscreen ? "h-[100dvh] min-h-[100dvh] w-screen p-0" : "w-full px-12 md:px-24"}`}
            onWheel={handleWheel}
          >
            {!isFullscreen && (
              <>
                <Button
                  variant="secondary"
                  className="absolute left-2 z-10 h-12 w-12 rounded-full border-lightbox-border bg-white/10 p-0 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-6"
                  onClick={(event) => { event.stopPropagation(); navigate(-1); }}
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  className="absolute right-2 z-10 h-12 w-12 rounded-full border-lightbox-border bg-white/10 p-0 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-6"
                  onClick={(event) => { event.stopPropagation(); navigate(1); }}
                  aria-label="Next media"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </Button>
              </>
            )}

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={item.id}
                className="flex h-full w-full items-center justify-center"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: transitionDirection * 20, scale: 0.985 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: transitionDirection * -10, scale: 0.99 }}
                transition={{ duration: 0.21, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="flex h-full w-full items-center justify-center"
                  animate={driftEnabled && drift ? { scale: drift.scale, x: drift.x, y: drift.y } : { scale: 1, x: 0, y: 0 }}
                  transition={driftEnabled ? { duration: slideshowPace === "slow" ? 10.5 : 7, ease: "linear" } : { duration: 0.18, ease: "easeOut" }}
                >
                  <div
                    data-viewer-gesture-surface
                    className={`relative flex h-full w-full touch-none select-none items-center justify-center ${scale > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
                    onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    style={{
                      transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                      transition: isPanning ? "none" : "transform 0.16s cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                  {isImageLoading ? (
                    <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-lightbox-border border-t-accent-foreground" />
                  ) : null}
                  {item.media_type === "image" && delivery ? (
                    <ReliableMediaImage
                      target={viewerTarget}
                      alt={delivery.alt}
                      blurhash={delivery.blurhash}
                      width={delivery.width}
                      height={delivery.height}
                      sizes="100vw"
                      className="pointer-events-none h-auto w-auto max-h-full max-w-full object-contain transition-opacity duration-200"
                      priority
                      draggable={false}
                      onLoad={handleImageLoad}
                      onUnavailable={handleImageUnavailable}
                    />
                  ) : failedVideos[item.id] || !viewerTarget.src ? (
                    <div className="flex min-h-64 min-w-64 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 px-8 text-center text-sm text-white/65">
                      Video unavailable
                    </div>
                  ) : (
                    <video
                      key={viewerTarget.src}
                      src={viewerTarget.src}
                      poster={delivery?.card.src ?? undefined}
                      controls
                      preload="metadata"
                      controlsList={protectAssets ? "nodownload" : undefined}
                      className="h-auto w-auto max-h-full max-w-full object-contain shadow-2xl shadow-black/40 sm:rounded-[18px]"
                      onError={() => setFailedVideos((current) => ({ ...current, [item.id]: true }))}
                    />
                  )}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {infoOpen && delivery ? <ViewerInfoSheet item={item} delivery={delivery} currentIndex={currentIndex!} total={media.length} onClose={() => setInfoOpen(false)} /> : null}

          {!isFullscreen && controlsVisible ? (
            <div data-viewer-chrome="bottom" className="absolute inset-x-0 bottom-0 z-20">
              <ViewerFilmstrip media={media} item={item} currentIndex={currentIndex!} albumStatus={albumStatus} downloadAllowed={downloadAllowed} onSelect={selectMedia} />
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
