/**
 * Lightweight global "scroll-busy" signal for the environment canvas.
 *
 * When the timeline is scrolling rapidly, we want to pause the WebGL canvas
 * (wind chimes, particles) to avoid GPU contention on low-end devices.
 *
 * Usage:
 *   Emitter: emitScrollBusy(true/false)  — from MediaTimeline scroll handler
 *   Consumer: useScrollBusy()           — in PublicDepthEnvironment or wrapper
 *
 * Implementation: native CustomEvent on window — zero dependencies, no context
 * threading required. The signal is intentionally coarse (boolean + debounce).
 */

const EVENT_NAME = "oriana:scroll-busy";
const IDLE_DEBOUNCE_MS = 400;

let idleTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Emit a scroll-busy signal. Automatically emits idle after IDLE_DEBOUNCE_MS
 * of inactivity so callers don't need to track idle manually.
 */
export function emitScrollBusy(): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: true }));

  if (idleTimer !== null) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(() => {
    idleTimer = null;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: false }));
  }, IDLE_DEBOUNCE_MS);
}

/**
 * React hook: returns true while the timeline is actively scrolling.
 * Intended for use in the environment canvas wrapper to pause heavy rendering.
 */
import { useEffect, useState } from "react";

export function useScrollBusy(): boolean {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      setBusy((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return busy;
}
