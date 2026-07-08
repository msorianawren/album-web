"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n-client";
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
  const { t } = useI18n();
  const item = currentIndex === null ? null : media[currentIndex];
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [autoPlay, setAutoPlay] = useState(false);
  const isImageLoading = item?.media_type === "image" && !loadedImages[item.id];
  const imageWidth = item?.width ?? 1600;
  const imageHeight = item?.height ?? 1200;
  const imageSource = item?.medium_url ?? item?.url ?? "";

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrevious();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose, onNext, onPrevious]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    if (!autoPlay) return;
    const timer = window.setInterval(onNext, item.media_type === "video" ? 9000 : 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, item, onNext]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden bg-[rgba(0,0,0,0.82)] px-3 py-3 text-accent-foreground backdrop-blur-xl sm:gap-4 sm:px-5 sm:py-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-label={t("media.viewer")}
        >
          <div className="flex items-center justify-between gap-3" onClick={(event) => event.stopPropagation()}>
            <Button
              variant="secondary"
              className="h-11 rounded-full border-lightbox-border bg-white/15 px-3 text-white shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white hover:text-black sm:px-4"
              onClick={() => setAutoPlay((current) => !current)}
              aria-label={autoPlay ? t("media.pauseSlideshow") : t("media.startSlideshow")}
            >
              {autoPlay ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
              <span className="hidden sm:inline">{autoPlay ? t("media.pause") : t("media.slideshow")}</span>
            </Button>
            <div className="min-w-0 text-center text-xs text-accent-foreground/76 sm:text-sm">
              <span className="font-semibold text-accent-foreground">
                {currentIndex! + 1} / {media.length}
              </span>
              <span className="mx-2 text-accent-foreground/36">|</span>
              <span className="inline-block max-w-[46vw] truncate align-bottom">
                {item.title ?? item.original_filename ?? (item.media_type === "image" ? t("media.image") : t("media.video"))}
              </span>
            </div>
            <Button
              variant="secondary"
              className="h-11 rounded-full border-lightbox-border bg-white/15 px-3 text-white shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white hover:text-black sm:px-4"
              onClick={onClose}
              aria-label={t("media.closeViewer")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("media.close")}</span>
            </Button>
          </div>

          <Button
            variant="secondary"
            className="absolute left-3 top-1/2 z-20 h-12 w-auto -translate-y-1/2 rounded-full border-lightbox-border bg-white/15 px-3 text-white shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white hover:text-black md:left-6 md:px-4"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            aria-label={t("media.previousMedia")}
          >
            <ChevronLeft className="h-6 w-6 rtl-flip" aria-hidden="true" />
            <span className="hidden lg:inline">{t("media.previous")}</span>
          </Button>

          <div className="flex min-h-0 items-center justify-center overflow-hidden px-12 sm:px-16 md:px-28">
            <motion.div
              className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
              key={item.id}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {isImageLoading ? (
                <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-lightbox-border border-t-accent-foreground" />
              ) : null}
              {item.media_type === "image" ? (
                <Image
                  src={imageSource}
                  alt={item.title ?? item.original_filename ?? t("media.image")}
                  width={imageWidth}
                  height={imageHeight}
                  sizes="100vw"
                  className="h-full w-full rounded-[14px] object-contain shadow-2xl shadow-black/40 sm:rounded-[18px]"
                  unoptimized
                  priority
                  draggable={!protectAssets}
                  onLoad={() =>
                    setLoadedImages((current) => ({ ...current, [item.id]: true }))
                  }
                />
              ) : (
                <video
                  src={item.url}
                  poster={item.poster_url ?? item.thumbnail_url ?? undefined}
                  controls
                  preload="metadata"
                  controlsList={protectAssets ? "nodownload" : undefined}
                  className="h-full w-full rounded-[14px] object-contain shadow-2xl shadow-black/40 sm:rounded-[18px]"
                />
              )}
            </motion.div>
          </div>

          <Button
            variant="secondary"
            className="absolute right-3 top-1/2 z-20 h-12 w-auto -translate-y-1/2 rounded-full border-lightbox-border bg-white/15 px-3 text-white shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white hover:text-black md:right-6 md:px-4"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            aria-label={t("media.nextMedia")}
          >
            <span className="hidden lg:inline">{t("media.next")}</span>
            <ChevronRight className="h-6 w-6 rtl-flip" aria-hidden="true" />
          </Button>

          <div
            className="mx-auto grid w-full max-w-[min(56rem,calc(100vw-1.5rem))] shrink-0 gap-2 rounded-[1.2rem] border border-lightbox-border bg-lightbox-control px-3 py-2 text-xs text-accent-foreground shadow-xl shadow-black/20 backdrop-blur-md sm:max-w-[min(56rem,calc(100vw-6rem))] sm:px-4 sm:text-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2">
              <MediaLikeButton mediaId={item.id} />
              {downloadAllowed ? (
                <DownloadButton href={`/api/media/${item.id}/download`} />
              ) : null}
            </div>
            {media.length > 1 ? (
              <div className="hidden max-w-full gap-2 overflow-x-auto pb-1 sm:flex">
                {media.map((thumb, index) => (
                  <button
                    key={thumb.id}
                    type="button"
                    onClick={() => onSelect(index)}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                      index === currentIndex ? "border-accent-foreground" : "border-lightbox-border opacity-70 hover:opacity-100"
                    }`}
                    aria-label={t("media.openNumber", { number: index + 1 })}
                  >
                    {thumb.media_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb.thumbnail_url ?? thumb.medium_url ?? thumb.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-black/35">
                        <Play className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
