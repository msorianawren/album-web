const nativeVideoMimeType = "video/mp4";
export const maxNativeVideoBytes = 500 * 1024 * 1024;
export const nativeVideoKeyPrefix = "landing/facebook-feed/videos/";

function configuredOrigin(publicAssetOrigin: string | undefined) {
  if (!publicAssetOrigin) throw new Error("Project media storage is not configured for native videos.");
  const origin = new URL(publicAssetOrigin);
  if (origin.protocol !== "https:") throw new Error("Project media storage must use HTTPS.");
  if (origin.hostname.endsWith(".r2.dev")) throw new Error("Project media storage must use its custom media domain for native videos.");
  return origin;
}

export function nativeVideoKeyFromUrl(input: string, publicAssetOrigin: string | undefined) {
  const origin = configuredOrigin(publicAssetOrigin);
  const candidate = new URL(input);
  if (candidate.protocol !== "https:" || candidate.origin !== origin.origin || candidate.search || candidate.hash) {
    throw new Error("Use a server-managed native video URL from project media storage.");
  }
  const basePath = origin.pathname.replace(/\/$/, "");
  const path = candidate.pathname;
  if (!path.startsWith(`${basePath}/${nativeVideoKeyPrefix}`)) {
    throw new Error("Use a server-managed native video URL from project media storage.");
  }
  const key = decodeURIComponent(path.slice(basePath.length + 1));
  if (!key.startsWith(nativeVideoKeyPrefix) || key.includes("..") || !key.endsWith(".mp4")) {
    throw new Error("Use a server-managed native video URL from project media storage.");
  }
  return key;
}

export function validateNativeVideoUrl(input: string, publicAssetOrigin: string | undefined) {
  nativeVideoKeyFromUrl(input, publicAssetOrigin);
  return new URL(input).toString();
}

export function validateNativeVideoMetadata(mimeType: string | null, sizeBytes: number | null) {
  if (mimeType !== nativeVideoMimeType) throw new Error("Native playback requires an MP4 video uploaded through Studio.");
  if (!sizeBytes || sizeBytes > maxNativeVideoBytes) throw new Error("Native video is missing or exceeds the 500 MB limit.");
}
