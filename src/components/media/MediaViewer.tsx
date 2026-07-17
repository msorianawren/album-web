"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X, Maximize, Minimize, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { Button } from "@/components/ui/Button";
import { ORIANA_MEDIA_VIEWER_STATE_EVENT } from "@/lib/assistant/runtime-events";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { AlbumStatus, Media } from "@/lib/types";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";

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

const clamp = (value: number, limit: number) => Math.min(Math.max(value, -limit), limit);

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
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [failedVideos, setFailedVideos] = useState<Record<string, boolean>>({});
  const [autoPlay, setAutoPlay] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { markAlbumViewed } = useAlbumViewMemory();

  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const delivery = item
    ? getMediaDeliveryDescriptor(item, {
        albumStatus,
        isAuthorized: true,
        downloadAllowed,
      })
    : null;

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const constrainTranslate = useCallback((value: { x: number; y: number }, targetScale: number) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds || targetScale <= 1) return { x: 0, y: 0 };

    const maxX = Math.min((bounds.width * (targetScale - 1)) / 2, Math.max(0, bounds.width / 2 - 24));
    const maxY = Math.min((bounds.height * (targetScale - 1)) / 2, Math.max(0, bounds.height / 2 - 24));
    return { x: clamp(value.x, maxX), y: clamp(value.y, maxY) };
  }, []);

  const changeScale = useCallback((nextScale: number) => {
    setScale(nextScale);
    setTranslate((current) => constrainTranslate(current, nextScale));
  }, [constrainTranslate]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === containerRef.current) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    void containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const navigate = useCallback((direction: -1 | 1) => {
    resetZoom();
    setTransitionDirection(direction);
    if (direction === 1) onNext();
    else onPrevious();
  }, [onNext, onPrevious, resetZoom]);

  const selectMedia = useCallback((index: number) => {
    resetZoom();
    setTransitionDirection(index >= (currentIndex ?? 0) ? 1 : -1);
    onSelect(index);
  }, [currentIndex, onSelect, resetZoom]);

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
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      if (!active) resetZoom();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [resetZoom]);

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
      if (event.key === "=" || event.key === "+") changeScale(Math.min(scale + 0.5, 5));
      if (event.key === "-") changeScale(Math.max(scale - 0.5, 1));
      if (event.key === "0") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeScale, item, navigate, onClose, resetZoom, scale]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  useEffect(() => {
    if (item) document.body.dataset.orianaMediaViewerOpen = "true";
    else delete document.body.dataset.orianaMediaViewerOpen;
    window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_STATE_EVENT));

    return () => {
      delete document.body.dataset.orianaMediaViewerOpen;
      window.dispatchEvent(new Event(ORIANA_MEDIA_VIEWER_STATE_EVENT));
    };
  }, [item]);

  useEffect(() => {
    if (!item || !autoPlay) return;
    const timer = window.setInterval(() => navigate(1), item.media_type === "video" ? 9000 : 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, item, navigate]);

  const handleWheel = (event: React.WheelEvent) => {
    const nextScale = Math.min(Math.max(1, scale - event.deltaY * 0.005), 5);
    changeScale(nextScale);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartPos.current = { x: event.clientX - translate.x, y: event.clientY - translate.y };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    setTranslate(constrainTranslate({
      x: event.clientX - dragStartPos.current.x,
      y: event.clientY - dragStartPos.current.y,
    }, scale));
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          ref={containerRef}
          className="media-viewer-shell fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#0a0a0a]/95 text-accent-foreground backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          {!isFullscreen && (
            <div className="z-20 flex min-h-[80px] flex-none items-center justify-between p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => setAutoPlay((current) => !current)}
                  aria-label={autoPlay ? "Pause slideshow" : "Start slideshow"}
                >
                  {autoPlay ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
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
                <div
                  className={`relative flex h-full w-full items-center justify-center ${scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
                  onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                  }}
                >
                  {isImageLoading ? (
                    <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-lightbox-border border-t-accent-foreground" />
                  ) : null}
                  {item.media_type === "image" && delivery ? (
                    <ReliableMediaImage
                      target={delivery.viewer}
                      alt={delivery.alt}
                      width={delivery.width}
                      height={delivery.height}
                      sizes="100vw"
                      className="pointer-events-none h-auto w-auto max-h-full max-w-full object-contain transition-opacity duration-200"
                      priority
                      draggable={false}
                      onLoad={() => setLoadedImages((current) => ({ ...current, [item.id]: true }))}
                      onUnavailable={() => setLoadedImages((current) => ({ ...current, [item.id]: true }))}
                    />
                  ) : failedVideos[item.id] || !delivery?.viewer.src ? (
                    <div className="flex min-h-64 min-w-64 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 px-8 text-center text-sm text-white/65">
                      Video unavailable
                    </div>
                  ) : (
                    <video
                      key={delivery.viewer.src}
                      src={delivery.viewer.src}
                      poster={delivery.card.src ?? undefined}
                      controls
                      preload="metadata"
                      controlsList={protectAssets ? "nodownload" : undefined}
                      className="h-auto w-auto max-h-full max-w-full object-contain shadow-2xl shadow-black/40 sm:rounded-[18px]"
                      onError={() => setFailedVideos((current) => ({ ...current, [item.id]: true }))}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {!isFullscreen && (
            <div className="z-20 flex min-h-[140px] flex-none flex-col items-center p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 text-center text-xs text-white/70 shadow-black drop-shadow-md">
                <span className="font-semibold text-white">{currentIndex! + 1} / {media.length}</span>
                <span className="mx-2 opacity-50">|</span>
                <span className="inline-block max-w-[60vw] truncate align-bottom">
                  {item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}
                </span>
              </div>

              <div className="flex w-full max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-3 rounded-[1.2rem] border border-lightbox-border bg-white/5 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                <div className="flex shrink-0 items-center justify-center gap-2">
                  <MediaLikeButton mediaId={item.id} />
                  {downloadAllowed && delivery?.downloadHref ? <DownloadButton href={delivery.downloadHref} /> : null}
                </div>
                {media.length > 1 && (
                  <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto sm:flex sm:justify-end">
                    {media.map((thumb, index) => {
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
