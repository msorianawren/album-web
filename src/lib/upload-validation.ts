import { extname } from "node:path";
import { imageMimeTypes, videoMimeTypes, getMediaTypeFromMime, getUploadLimit } from "@/lib/config";
import { safeFilename } from "@/lib/filenames";
import type { MediaType } from "@/lib/types";

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

function isJpeg(buffer: Buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer) {
  return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isWebp(buffer: Buffer) {
  return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

function getIsoBrand(buffer: Buffer) {
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") return "";
  return buffer.toString("ascii", 8, 12);
}

function isAvif(buffer: Buffer) {
  const brand = getIsoBrand(buffer);
  return ["avif", "avis", "mif1", "msf1"].includes(brand);
}

function isMp4(buffer: Buffer) {
  const brand = getIsoBrand(buffer);
  return ["isom", "iso2", "mp41", "mp42", "M4V ", "M4A ", "qt  "].includes(brand);
}

function isWebm(buffer: Buffer) {
  return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

function hasExpectedSignature(mimeType: string, buffer: Buffer) {
  if (mimeType === "image/jpeg") return isJpeg(buffer);
  if (mimeType === "image/png") return isPng(buffer);
  if (mimeType === "image/webp") return isWebp(buffer);
  if (mimeType === "image/avif") return isAvif(buffer);
  if (mimeType === "video/mp4") return isMp4(buffer);
  if (mimeType === "video/quicktime") return getIsoBrand(buffer) === "qt  " || isMp4(buffer);
  if (mimeType === "video/webm") return isWebm(buffer);
  return false;
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
  const mediaType = getMediaTypeFromMime(mimeType);
  const supportedMime = [...imageMimeTypes, ...videoMimeTypes].includes(
    mimeType as (typeof imageMimeTypes)[number] | (typeof videoMimeTypes)[number],
  );

  if (!mediaType || !supportedMime) {
    return {
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: `Unsupported file type: ${mimeType || "unknown"}.`,
      status: 415,
    };
  }

  if (mediaType === "image" && options.enableImageUploads === false) {
    return {
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Image uploads are disabled in Studio settings.",
      status: 415,
    };
  }

  if (mediaType === "video" && options.enableVideoUploads === false) {
    return {
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Video uploads are disabled in Studio settings.",
      status: 415,
    };
  }

  const dynamicLimit =
    mediaType === "image"
      ? options.maxImageSizeBytes ?? getUploadLimit(mediaType)
      : options.maxVideoSizeBytes ?? getUploadLimit(mediaType);

  if (size > dynamicLimit) {
    return {
      ok: false,
      code: "PAYLOAD_TOO_LARGE",
      message: `${fileName} exceeds the ${mediaType} upload limit.`,
      status: 413,
    };
  }

  const extension = getExtension(fileName);
  const allowedExtensions = allowedExtensionsByMime[mimeType] ?? [];
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: `${fileName} has an extension that does not match ${mimeType}.`,
      status: 415,
    };
  }

  if (!hasExpectedSignature(mimeType, buffer)) {
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
      mediaType,
      safeName: safeFilename(fileName, "upload"),
    },
  };
}
