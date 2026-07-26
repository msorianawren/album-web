"use client";

import { useCallback, useReducer, type SetStateAction } from "react";
import type { SlideshowPace } from "@/lib/media/cinematic-drift";

export type ViewerStatus = "viewing" | "zooming" | "info-open" | "slideshow";

export interface ViewerMachineState {
  loadedImages: Record<string, boolean>;
  failedVideos: Record<string, boolean>;
  autoPlay: boolean;
  slideshowPace: SlideshowPace;
  preferencesReady: boolean;
  pageHidden: boolean;
  scale: number;
  translate: { x: number; y: number };
  isFullscreen: boolean;
  controlsVisible: boolean;
  infoOpen: boolean;
  transitionDirection: -1 | 1;
  status: ViewerStatus;
}

type ViewerStateKey = Exclude<keyof ViewerMachineState, "status">;
type ViewerMachineAction = {
  [Key in ViewerStateKey]: {
    type: "set";
    key: Key;
    value: SetStateAction<ViewerMachineState[Key]>;
  };
}[ViewerStateKey];

export const initialViewerMachineState: ViewerMachineState = {
  loadedImages: {},
  failedVideos: {},
  autoPlay: false,
  slideshowPace: "still",
  preferencesReady: false,
  pageHidden: false,
  scale: 1,
  translate: { x: 0, y: 0 },
  isFullscreen: false,
  controlsVisible: true,
  infoOpen: false,
  transitionDirection: 1,
  status: "viewing",
};

function statusFor(state: Omit<ViewerMachineState, "status">): ViewerStatus {
  if (state.infoOpen) return "info-open";
  if (state.autoPlay) return "slideshow";
  if (state.scale > 1) return "zooming";
  return "viewing";
}

export function viewerMachineReducer(
  state: ViewerMachineState,
  action: ViewerMachineAction,
): ViewerMachineState {
  const current = state[action.key];
  const nextValue = typeof action.value === "function"
    ? (action.value as (previous: typeof current) => typeof current)(current)
    : action.value;
  const next = { ...state, [action.key]: nextValue } as Omit<ViewerMachineState, "status">;
  return { ...next, status: statusFor(next) };
}

export function useViewerMachine() {
  const [state, dispatch] = useReducer(viewerMachineReducer, initialViewerMachineState);
  const set = useCallback(<Key extends ViewerStateKey>(
    key: Key,
    value: SetStateAction<ViewerMachineState[Key]>,
  ) => dispatch({ type: "set", key, value } as ViewerMachineAction), []);
  const setLoadedImages = useCallback((value: SetStateAction<ViewerMachineState["loadedImages"]>) => set("loadedImages", value), [set]);
  const setFailedVideos = useCallback((value: SetStateAction<ViewerMachineState["failedVideos"]>) => set("failedVideos", value), [set]);
  const setAutoPlay = useCallback((value: SetStateAction<ViewerMachineState["autoPlay"]>) => set("autoPlay", value), [set]);
  const setSlideshowPace = useCallback((value: SetStateAction<ViewerMachineState["slideshowPace"]>) => set("slideshowPace", value), [set]);
  const setPreferencesReady = useCallback((value: SetStateAction<ViewerMachineState["preferencesReady"]>) => set("preferencesReady", value), [set]);
  const setPageHidden = useCallback((value: SetStateAction<ViewerMachineState["pageHidden"]>) => set("pageHidden", value), [set]);
  const setScale = useCallback((value: SetStateAction<ViewerMachineState["scale"]>) => set("scale", value), [set]);
  const setTranslate = useCallback((value: SetStateAction<ViewerMachineState["translate"]>) => set("translate", value), [set]);
  const setIsFullscreen = useCallback((value: SetStateAction<ViewerMachineState["isFullscreen"]>) => set("isFullscreen", value), [set]);
  const setControlsVisible = useCallback((value: SetStateAction<ViewerMachineState["controlsVisible"]>) => set("controlsVisible", value), [set]);
  const setInfoOpen = useCallback((value: SetStateAction<ViewerMachineState["infoOpen"]>) => set("infoOpen", value), [set]);
  const setTransitionDirection = useCallback((value: SetStateAction<ViewerMachineState["transitionDirection"]>) => set("transitionDirection", value), [set]);

  return {
    ...state,
    setLoadedImages,
    setFailedVideos,
    setAutoPlay,
    setSlideshowPace,
    setPreferencesReady,
    setPageHidden,
    setScale,
    setTranslate,
    setIsFullscreen,
    setControlsVisible,
    setInfoOpen,
    setTransitionDirection,
  };
}
