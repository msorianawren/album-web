"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X, Maximize, Minimize, ZoomIn, Info } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { Button } from "@/components/ui/Button";
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
  const visibleFilmstrip = media.slice(Math.max(0, (currentIndex ?? 0) - 10), (currentIndex ?? 0) + 11);
  const ambientHue = backdropHue(delivery?.blurhash);
  const drift = item ? cinematicDrift(item.id) : null;
  const driftEnabled = Boolean(autoPlay && slideshowPace !== "still" && item?.media_type === "image" && !reducedMotion);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [setScale, setTranslate]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === containerRef.current) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    void containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

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
    onToggleControls: () => setControlsVisible((visible) => !visible),
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
      if (event.key === "Escape") {
        if (document.fullscreenElement === containerRef.current) {
          event.preventDefault();
          void document.exitFullscreen().catch(() => {});
          return;
        }
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
          onPointerMove={() => setControlsVisible(true)}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70 transition-colors duration-500"
            style={{ background: `radial-gradient(circle at 50% 45%, hsl(${ambientHue} 30% 16% / 0.62), transparent 58%), radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,.78) 100%)` }}
            aria-hidden="true"
          />
          {!isFullscreen && controlsVisible && (
            <div className="z-20 flex min-h-[80px] flex-none items-center justify-between p-4 transition-opacity sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => setAutoPlay((current) => !current)}
                  aria-label={autoPlay ? "Pause slideshow" : "Start slideshow"}
                >
                  {autoPlay ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => setSlideshowPace((pace) => pace === "still" ? "slow" : pace === "slow" ? "cinema" : "still")}
                  aria-label={`Slideshow pace: ${slideshowPace}`}
                >
                  {slideshowPace === "still" ? "Still" : slideshowPace === "slow" ? "Slow" : "Cinema"}
                </Button>
                {scale > 1 && (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    <ZoomIn className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-semibold">Reset Zoom</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={toggleFullscreen}
                  aria-label="Enter fullscreen"
                >
                  <Maximize className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => {
                    setAutoPlay(false);
                    setInfoOpen((open) => !open);
                  }}
                  aria-label="Toggle media information"
                  aria-pressed={infoOpen}
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={onClose}
                  aria-label="Close media viewer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {isFullscreen && (
            <Button
              variant="secondary"
              className="absolute right-[max(env(safe-area-inset-right),1rem)] top-[max(env(safe-area-inset-top),1rem)] z-30 h-10 rounded-full border-lightbox-border bg-black/45 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={toggleFullscreen}
              aria-label="Exit fullscreen"
            >
              <Minimize className="mr-2 h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold">Exit fullscreen</span>
            </Button>
          )}

          <div
            ref={stageRef}
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
                      onLoad={() => {
                        setLoadedImages((current) => ({ ...current, [item.id]: true }));
                        const next = media[(currentIndex! + 1) % media.length];
                        if (next) prefetch(next.id, next.media_type === "video");
                      }}
                      onUnavailable={() => setLoadedImages((current) => ({ ...current, [item.id]: true }))}
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

          {infoOpen ? (
            <aside
              className="absolute inset-x-3 bottom-3 z-30 rounded-[1.25rem] border border-white/10 bg-black/75 p-5 text-sm text-white/75 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[min(23rem,calc(100vw-3rem))]"
              aria-label="Media information"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">{item.media_type === "image" ? "Artwork" : "Film"}</p>
                  <p className="mt-2 text-base font-medium text-white">{item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}</p>
                </div>
                <Button
                  variant="secondary"
                  className="h-9 w-9 shrink-0 rounded-full border-lightbox-border bg-white/10 p-0 text-white hover:bg-white hover:text-black"
                  onClick={() => setInfoOpen(false)}
                  aria-label="Close media information"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {item.description ? <p className="mt-4 leading-6 text-white/70">{item.description}</p> : null}
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-xs">
                <div><dt className="uppercase tracking-[0.14em] text-white/40">Position</dt><dd className="mt-1 text-white/80">{currentIndex! + 1} of {media.length}</dd></div>
                <div><dt className="uppercase tracking-[0.14em] text-white/40">Format</dt><dd className="mt-1 text-white/80">{delivery?.width} × {delivery?.height}</dd></div>
              </dl>
            </aside>
          ) : null}

          {!isFullscreen && controlsVisible && (
            <div className="z-20 flex min-h-[140px] flex-none flex-col items-center p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 text-center text-xs text-white/70 shadow-black drop-shadow-md">
                <span className="font-semibold text-white">{currentIndex! + 1} / {media.length}</span>
                <span className="mx-2 opacity-50">|</span>
                <span className="inline-block max-w-[60vw] truncate align-bottom">
                  {item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}
                </span>
              </div>

              {media.length > 1 ? (
                <label className="mb-4 flex w-full max-w-[min(42rem,calc(100vw-3rem))] items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">
                  <span className="sr-only">Browse album timeline</span>
                  <input
                    type="range"
                    min="0"
                    max={media.length - 1}
                    value={currentIndex ?? 0}
                    onChange={(event) => selectMedia(Number(event.currentTarget.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                    aria-label="Browse album timeline"
                  />
                  <span className="min-w-10 text-right">{currentIndex! + 1} / {media.length}</span>
                </label>
              ) : null}

              <div className="flex w-full max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-3 rounded-[1.2rem] border border-lightbox-border bg-white/5 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                <div className="flex shrink-0 items-center justify-center gap-2">
                  <MediaLikeButton mediaId={item.id} />
                  {downloadAllowed && delivery?.downloadHref ? <DownloadButton href={delivery.downloadHref} /> : null}
                </div>
                {media.length > 1 && (
                  <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto sm:flex sm:justify-end">
                    {visibleFilmstrip.map((thumb) => {
                      const index = media.findIndex((candidate) => candidate.id === thumb.id);
                      const thumbDelivery = getMediaDeliveryDescriptor(thumb, { albumStatus, isAuthorized: true });
                      return (
                        <button
                          key={thumb.id}
                          type="button"
                          onClick={() => selectMedia(index)}
                          className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                            index === currentIndex ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-100 focus-visible:opacity-100"
                          }`}
                        >
                          {thumbDelivery.card.src ? (
                            <ReliableMediaImage target={thumbDelivery.card} alt="" fill sizes="64px" className="object-cover transition-opacity duration-150" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-white/5 text-[0.55rem] uppercase tracking-wider text-white/50">Unavailable</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
