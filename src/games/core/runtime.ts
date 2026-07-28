import { FixedStepClock } from "./lifecycle.ts";

const listeners = new Set<() => void>();
const suspensionReasons = new Map<string, number>();
let suspensionCount = 0;
export const GAME_RUNTIME_SUSPENSION_EVENT = "oriana-game-runtime-state";

function publishSuspension() {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.gameRuntimeSuspended = suspensionCount > 0 ? "true" : "false";
    window.dispatchEvent(new Event(GAME_RUNTIME_SUSPENSION_EVENT));
  }
  listeners.forEach((listener) => listener());
}

export function acquireGameRuntimeSuspension(reason: string) {
  if (!reason) throw new Error("A suspension reason is required.");
  suspensionReasons.set(reason, (suspensionReasons.get(reason) ?? 0) + 1);
  suspensionCount += 1;
  publishSuspension();
  let released = false;

  return () => {
    if (released) return;
    released = true;
    const remaining = (suspensionReasons.get(reason) ?? 1) - 1;
    if (remaining > 0) suspensionReasons.set(reason, remaining);
    else suspensionReasons.delete(reason);
    suspensionCount = Math.max(0, suspensionCount - 1);
    publishSuspension();
  };
}

export function subscribeGameRuntimeSuspension(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener(GAME_RUNTIME_SUSPENSION_EVENT, listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener(GAME_RUNTIME_SUSPENSION_EVENT, listener);
    }
  };
}

export function getGameRuntimeSuspensionSnapshot() {
  return suspensionCount > 0
    || (typeof document !== "undefined" && document.documentElement.dataset.gameRuntimeSuspended === "true");
}

export function getServerGameRuntimeSuspensionSnapshot() {
  return false;
}

export function getGameRuntimeSuspensionDiagnostics() {
  return {
    count: suspensionCount,
    reasons: Object.fromEntries(suspensionReasons),
  };
}

export interface FixedStepRuntimeOptions {
  stepMs?: number;
  maximumCatchUpSteps?: number;
  targetRenderFps?: 30 | 60 | 120;
  onTick(tick: number): void;
  onRender?(interpolation: number): void;
}

export function createFixedStepRuntime(options: FixedStepRuntimeOptions) {
  const clock = new FixedStepClock(options.stepMs, options.maximumCatchUpSteps);
  let frame = 0;
  let previousTimestamp: number | null = null;
  let previousRenderTimestamp: number | null = null;
  let running = false;
  let requested = false;
  let destroyed = false;
  const renderIntervalMs = 1000 / (options.targetRenderFps ?? 60);

  const loop = (timestamp: number) => {
    if (!running) return;
    if (previousTimestamp === null) previousTimestamp = timestamp;
    const advance = clock.advance(timestamp - previousTimestamp);
    previousTimestamp = timestamp;
    advance.ticks.forEach(options.onTick);
    if (
      previousRenderTimestamp === null
      || timestamp - previousRenderTimestamp >= renderIntervalMs - 0.5
    ) {
      options.onRender?.(advance.interpolation);
      previousRenderTimestamp = timestamp;
    }
    frame = requestAnimationFrame(loop);
  };

  const stopFrame = () => {
    running = false;
    cancelAnimationFrame(frame);
    previousTimestamp = null;
    previousRenderTimestamp = null;
  };

  const startFrame = () => {
    if (running || destroyed || (typeof document !== "undefined" && document.hidden)) return;
    running = true;
    previousTimestamp = null;
    frame = requestAnimationFrame(loop);
  };

  const handleVisibility = () => {
    if (document.hidden) stopFrame();
    else if (requested) startFrame();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibility);
  }

  return {
    start() {
      requested = true;
      startFrame();
    },
    pause() {
      requested = false;
      stopFrame();
    },
    reset() {
      clock.reset();
      previousTimestamp = null;
      previousRenderTimestamp = null;
    },
    setStepMs(stepMs: number) {
      clock.setStepMs(stepMs);
    },
    destroy() {
      requested = false;
      destroyed = true;
      stopFrame();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    },
    get tick() {
      return clock.currentTick;
    },
  };
}
