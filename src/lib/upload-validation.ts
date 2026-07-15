import { extname } from "node:path";
import { imageMimeTypes, videoMimeTypes, getMediaTypeFromMime, getUploadLimit } from "@/lib/config";
import { safeFilename } from "@/lib/filenames";
import type { MediaType } from "@/lib/types";
import { hasExpectedUploadSignature } from "@/lib/media/signatures";

export { detectImageMimeFromMagicBytes, hasExpectedUploadSignature } from "@/lib/media/signatures";

const allowedExtensionsByMime: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov", "qt"],
};

function getExtension(fileName: string) {
  return extname(fileName).replace(".", "").toLowerCase();
}

export interface ValidatedUpload {
  mediaType: MediaType;
  safeName: string;
}

export interface UploadValidationOptions {
  enableImageUploads?: boolean;
  enableVideoUploads?: boolean;
  maxImageSizeBytes?: number;
  maxVideoSizeBytes?: number;
}

export function validateUploadMetadata({
  fileName,
  mimeType,
  size,
  options = {},
}: {
  fileName: string;
  mimeType: string;
  size: number;
  options?: UploadValidationOptions;
}): { ok: true; value: ValidatedUpload } | { ok: false; code: "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "INVALID_INPUT"; message: string; status: number } {
  const mediaType = getMediaTypeFromMime(mimeType);
  const supportedMime = [...imageMimeTypes, ...videoMimeTypes].includes(
    mimeType as (typeof imageMimeTypes)[number] | (typeof videoMimeTypes)[number],
  );
  if (!mediaType || !supportedMime) {
    return { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: `Unsupported file type: ${mimeType || "unknown"}.`, status: 415 };
  }
  if (!Number.isSafeInteger(size) || size <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "File size must be a positive integer.", status: 400 };
  }
  if (
    (mediaType === "image" && options.enableImageUploads === false) ||
    (mediaType === "video" && options.enableVideoUploads === false)
  ) {
    return { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: `${mediaType === "image" ? "Image" : "Video"} uploads are disabled in Studio settings.`, status: 415 };
  }
  const dynamicLimit = mediaType === "image"
    ? options.maxImageSizeBytes ?? getUploadLimit(mediaType)
    : options.maxVideoSizeBytes ?? getUploadLimit(mediaType);
  if (size > dynamicLimit) {
    return { ok: false, code: "PAYLOAD_TOO_LARGE", message: `${fileName} exceeds the ${mediaType} upload limit.`, status: 413 };
  }
  const extension = getExtension(fileName);
  if (!extension || !(allowedExtensionsByMime[mimeType] ?? []).includes(extension)) {
    return { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: `${fileName} has an extension that does not match ${mimeType}.`, status: 415 };
  }
  return { ok: true, value: { mediaType, safeName: safeFilename(fileName, "upload") } };
}

export function validateUploadFile({
  fileName,
  mimeType,
  size,
  buffer,
  options = {},
}: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  options?: UploadValidationOptions;
}): { ok: true; value: ValidatedUpload } | { ok: false; code: "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "INVALID_INPUT"; message: string; status: number } {
  const metadata = validateUploadMetadata({ fileName, mimeType, size, options });
  if (!metadata.ok) return metadata;

  if (!hasExpectedUploadSignature(mimeType, buffer)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: `${fileName} does not look like a valid ${mimeType} file.`,
      status: 415,
    };
  }

  return {
    ok: true,
    value: {
      mediaType: metadata.value.mediaType,
      safeName: metadata.value.safeName,
    },
  };
}
