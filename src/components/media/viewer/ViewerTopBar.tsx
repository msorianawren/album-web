"use client";

import { Info, Maximize, Minimize, Pause, Play, Sparkles, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ViewerPresentation } from "@/hooks/useAlbumViewMemory";
import type { SlideshowPace } from "@/lib/media/cinematic-drift";

interface ViewerTopBarProps {
  autoPlay: boolean;
  slideshowPace: SlideshowPace;
  scale: number;
  isFullscreen: boolean;
  infoOpen: boolean;
  presentation: ViewerPresentation;
  onToggleAutoplay: () => void;
  onCyclePace: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onToggleInfo: () => void;
  onTogglePresentation: () => void;
  onClose: () => void;
}

const controlClassName = "h-10 rounded-full border-lightbox-border bg-white/10 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function ViewerTopBar({
  autoPlay,
  slideshowPace,
  scale,
  isFullscreen,
  infoOpen,
  presentation,
  onToggleAutoplay,
  onCyclePace,
  onResetZoom,
  onToggleFullscreen,
  onToggleInfo,
  onTogglePresentation,
  onClose,
}: ViewerTopBarProps) {
  if (isFullscreen) {
    return (
      <Button
        variant="secondary"
        className="absolute right-[max(env(safe-area-inset-right),1rem)] top-[max(env(safe-area-inset-top),1rem)] z-30 h-10 rounded-full border-lightbox-border bg-black/45 px-3 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={onToggleFullscreen}
        aria-label="Exit fullscreen"
      >
        <Minimize className="mr-2 h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold">Exit fullscreen</span>
      </Button>
    );
  }

  return (
    <div className="z-20 flex min-h-[80px] flex-none items-center justify-between p-4 transition-opacity sm:p-6" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className={controlClassName} onClick={onToggleAutoplay} aria-label={autoPlay ? "Pause slideshow" : "Start slideshow"}>
          {autoPlay ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </Button>
        <Button variant="secondary" className={`${controlClassName} text-xs font-semibold`} onClick={onCyclePace} aria-label={`Slideshow pace: ${slideshowPace}`}>
          {slideshowPace === "still" ? "Still" : slideshowPace === "slow" ? "Slow" : "Cinema"}
        </Button>
        <Button
          variant="secondary"
          className={`${controlClassName} text-xs font-semibold`}
          onClick={onTogglePresentation}
          aria-label={`Viewer presentation: ${presentation}`}
          aria-pressed={presentation === "cinematic"}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{presentation === "cinematic" ? "Cinematic" : "Clean"}</span>
        </Button>
        {scale > 1 ? (
          <Button variant="secondary" className={controlClassName} onClick={onResetZoom} aria-label="Reset zoom">
            <ZoomIn className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-semibold">Reset Zoom</span>
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className={controlClassName} onClick={onToggleFullscreen} aria-label="Enter fullscreen">
          <Maximize className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="secondary" className={controlClassName} onClick={onToggleInfo} aria-label="Toggle media information" aria-pressed={infoOpen}>
          <Info className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="secondary" className={controlClassName} onClick={onClose} aria-label="Close media viewer">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
