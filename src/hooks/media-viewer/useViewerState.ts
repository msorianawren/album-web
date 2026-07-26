"use client";

import { useState } from "react";
import type { SlideshowPace } from "@/lib/media/cinematic-drift";

export function useViewerState() {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [failedVideos, setFailedVideos] = useState<Record<string, boolean>>({});
  const [autoPlay, setAutoPlay] = useState(false);
  const [slideshowPace, setSlideshowPace] = useState<SlideshowPace>("still");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(1);

  return {
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
  };
}
