export const ORIANA_COMPANION_OPEN_EVENT = "oriana-companion-open";
export const ORIANA_COMPANION_CONTEXT_EVENT = "oriana-companion-context";
export const ORIANA_MEDIA_VIEWER_STATE_EVENT = "oriana-media-viewer-state";
export const ORIANA_MEDIA_VIEWER_OPEN_EVENT = "oriana-media-viewer-open";
export const ORIANA_MEDIA_VIEWER_CLOSE_EVENT = "oriana-media-viewer-close";
export const ORIANA_MEDIA_VIEWER_IDLE_EVENT = "oriana-media-viewer-idle";
export const ORIANA_MEDIA_VIEWER_ACTIVE_EVENT = "oriana-media-viewer-active";

export type CompanionContextEventDetail = {
  kind: "form_invalid" | "operation_pending" | "operation_succeeded" | "operation_failed" | "access_unavailable";
};

export type CompanionOpenEventDetail = {
  opener?: HTMLElement | null;
};

export function dispatchCompanionContextEvent(detail: CompanionContextEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CompanionContextEventDetail>(ORIANA_COMPANION_CONTEXT_EVENT, { detail }));
}

const disabledRuntimePrefixes = ["/studio", "/login", "/auth", "/boycott"];

export function isOrianaCompanionRuntimePath(pathname: string) {
  const safePath = pathname || "/";
  return !disabledRuntimePrefixes.some(
    (prefix) => safePath === prefix || safePath.startsWith(`${prefix}/`),
  );
}
