"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X, Maximize, Minimize, ZoomIn } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { Button } from "@/components/ui/Button";
import type { Media } from "@/lib/types";

interface MediaViewerProps {
  media: Media[];
  currentIndex: number | null;
  downloadAllowed: boolean;
  protectAssets?: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}

export function MediaViewer({
  media,
  currentIndex,
  downloadAllowed,
  protectAssets = false,
  onClose,
  onNext,
  onPrevious,
  onSelect,
}: MediaViewerProps) {
  const item = currentIndex === null ? null : media[currentIndex];
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [autoPlay, setAutoPlay] = useState(false);
  
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const imageWidth = item?.width ?? 1600;
  const imageHeight = item?.height ?? 1200;
  const imageSource = item?.medium_url ?? item?.url ?? "";

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "=" || event.key === "+") {
        setScale(s => Math.min(s + 0.5, 5));
      }
      if (event.key === "-") {
        setScale(s => {
          const n = Math.max(s - 0.5, 1);
          if (n === 1) setTranslate({ x: 0, y: 0 });
          return n;
        });
      }
      if (event.key === "0") {
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose, onNext, onPrevious]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [item]);

  useEffect(() => {
    if (!item || !autoPlay) return;
    const timer = window.setInterval(onNext, item.media_type === "video" ? 9000 : 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, item, onNext]);

  const handleWheel = (e: React.WheelEvent) => {
    const newScale = Math.min(Math.max(1, scale - e.deltaY * 0.005), 5);
    setScale(newScale);
    if (newScale === 1) setTranslate({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartPos.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    setTranslate({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-50 bg-[#0a0a0a]/95 text-accent-foreground backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          {/* Main Image Area with Wheel Zoom */}
          <div 
            className="absolute inset-0 flex items-center justify-center overflow-hidden" 
            onClick={onClose}
            onWheel={handleWheel}
          >
            <motion.div
              className={`relative flex h-full max-h-screen w-full max-w-screen items-center justify-center transition-transform ${scale > 1 ? isDragging ? "cursor-grabbing" : "cursor-grab" : "cursor-default"}`}
              key={item.id}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out"
              }}
            >
              {isImageLoading ? (
                <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-lightbox-border border-t-accent-foreground" />
              ) : null}
              {item.media_type === "image" ? (
                <Image
                  src={imageSource}
                  alt={item.title ?? item.original_filename ?? "Album image"}
                  width={imageWidth}
                  height={imageHeight}
                  sizes="100vw"
                  className="max-h-screen max-w-screen object-contain pointer-events-none"
                  unoptimized
                  priority
                  draggable={false}
                  onLoad={() => setLoadedImages((current) => ({ ...current, [item.id]: true }))}
                />
              ) : (
                <video
                  src={item.url}
                  poster={item.poster_url ?? item.thumbnail_url ?? undefined}
                  controls
                  preload="metadata"
                  controlsList={protectAssets ? "nodownload" : undefined}
                  className="max-h-screen max-w-screen object-contain shadow-2xl shadow-black/40 sm:rounded-[18px]"
                />
              )}
            </motion.div>
          </div>

          {/* Top Controls */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="pointer-events-auto flex items-center gap-2">
              <Button
                variant="secondary"
                className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
                onClick={() => setAutoPlay((current) => !current)}
                aria-label={autoPlay ? "Pause slideshow" : "Start slideshow"}
              >
                {autoPlay ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              </Button>
              {scale > 1 && (
                <Button
                  variant="secondary"
                  className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
                  onClick={resetZoom}
                  aria-label="Reset Zoom"
                >
                  <ZoomIn className="h-4 w-4 mr-2" />
                  <span className="text-xs font-semibold">Reset Zoom</span>
                </Button>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <Button
                variant="secondary"
                className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
                onClick={toggleFullscreen}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button
                variant="secondary"
                className="h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
                onClick={onClose}
                aria-label="Close media viewer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="pointer-events-none absolute inset-y-0 left-2 right-2 z-10 flex items-center justify-between md:left-6 md:right-6">
            <Button
              variant="secondary"
              className="pointer-events-auto h-12 w-12 rounded-full border-lightbox-border bg-white/10 p-0 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
              onClick={(event) => { event.stopPropagation(); onPrevious(); }}
              aria-label="Previous media"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              className="pointer-events-auto h-12 w-12 rounded-full border-lightbox-border bg-white/10 p-0 text-white backdrop-blur-md hover:bg-white hover:text-black transition-colors"
              onClick={(event) => { event.stopPropagation(); onNext(); }}
              aria-label="Next media"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
            {/* Title / Counter */}
            <div className="mb-4 text-center text-xs text-white/70 shadow-black drop-shadow-md">
              <span className="font-semibold text-white">
                {currentIndex! + 1} / {media.length}
              </span>
              <span className="mx-2 opacity-50">|</span>
              <span className="inline-block max-w-[60vw] truncate align-bottom">
                {item.title ?? item.original_filename ?? (item.media_type === "image" ? "Image" : "Video")}
              </span>
            </div>

            <div className="pointer-events-auto flex w-full max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-3 rounded-[1.2rem] border border-lightbox-border bg-white/5 p-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex shrink-0 items-center justify-center gap-2">
                <MediaLikeButton mediaId={item.id} />
                {downloadAllowed && <DownloadButton href={`/api/media/${item.id}/download`} />}
              </div>
              
              {media.length > 1 && (
                <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto sm:flex sm:justify-end">
                  {media.map((thumb, index) => (
                    <button
                      key={thumb.id}
                      type="button"
                      onClick={() => onSelect(index)}
                      className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                        index === currentIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      {thumb.media_type === "image" ? (
                        <Image
                          src={thumb.thumbnail_url ?? thumb.url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <video
                          src={thumb.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
