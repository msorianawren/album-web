export const ORIANA_COMPANION_OPEN_EVENT = "oriana-companion-open";
export const ORIANA_MEDIA_VIEWER_STATE_EVENT = "oriana-media-viewer-state";

const disabledRuntimePrefixes = ["/studio", "/login", "/auth", "/boycott"];

export function isOrianaCompanionRuntimePath(pathname: string) {
  const safePath = pathname || "/";
  return !disabledRuntimePrefixes.some(
    (prefix) => safePath === prefix || safePath.startsWith(`${prefix}/`),
  );
}
