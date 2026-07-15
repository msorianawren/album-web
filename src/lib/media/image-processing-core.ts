import { createHash } from "node:crypto";
import { encode } from "blurhash";
import sharp from "sharp";
import { detectImageMimeFromMagicBytes } from "./signatures.ts";
import type { SiteSettings } from "@/lib/types";

export const WEBP_VARIANTS = {
  thumbnail: { width: 640, quality: 82 },
  medium: { width: 1800, quality: 88 },
  large: { width: 3200, quality: 92 },
} as const;

export class MediaQuarantineError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "MediaQuarantineError";
  }
}

function orientation(width: number, height: number) {
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}

function safeDate(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

async function readCaptureDate(buffer: Buffer, enabled: boolean) {
  if (!enabled) return null;
  const exifr = await import("exifr");
  const parsed = await exifr.parse(buffer, {
    pick: ["DateTimeOriginal", "CreateDate"],
    translateKeys: true,
    translateValues: true,
    reviveValues: true,
    sanitize: true,
  });
  return safeDate(parsed?.DateTimeOriginal) ?? safeDate(parsed?.CreateDate);
}

function escapedWatermark(settings: SiteSettings) {
  if (!settings.enable_media_watermark || !settings.watermark_text) return null;
  const text = settings.watermark_text.replace(/[<>&"']/g, "").slice(0, 80);
  if (!text) return null;
  return Buffer.from(
    `<svg width="1200" height="260" viewBox="0 0 1200 260" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="86" font-weight="700" fill="rgba(255,255,255,.42)" stroke="rgba(0,0,0,.2)" stroke-width="2">${text}</text></svg>`,
  );
}

export interface ProcessedImageVariant {
  name: keyof typeof WEBP_VARIANTS;
  webp: Buffer;
  avif: Buffer | null;
}

export interface ProcessedImage {
  contentHash: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "portrait" | "landscape" | "square";
  takenAt: string | null;
  metadataStatus: "extracted" | "fallback";
  blurhash: string;
  variants: ProcessedImageVariant[];
}

export async function validateAndProcessImage(
  buffer: Buffer,
  declaredMimeType: string,
  settings: SiteSettings,
): Promise<ProcessedImage> {
  const magicMime = detectImageMimeFromMagicBytes(buffer);
  if (!magicMime || magicMime !== declaredMimeType) throw new MediaQuarantineError("IMAGE_MAGIC_MISMATCH");

  const decoder = sharp(buffer, { failOn: "error", limitInputPixels: settings.max_image_pixels, sequentialRead: true });
  const metadata = await decoder.metadata().catch(() => {
    throw new MediaQuarantineError("IMAGE_DECODE_FAILED");
  });
  const decodedMime = metadata.format === "jpeg"
    ? "image/jpeg"
    : metadata.format === "png"
      ? "image/png"
      : metadata.format === "webp"
        ? "image/webp"
        : metadata.format === "heif" && magicMime === "image/avif"
          ? "image/avif"
          : null;
  if (decodedMime !== declaredMimeType || !metadata.width || !metadata.height) {
    throw new MediaQuarantineError("IMAGE_DECODED_FORMAT_MISMATCH");
  }
  if (metadata.width > settings.max_image_dimension || metadata.height > settings.max_image_dimension || metadata.width * metadata.height > settings.max_image_pixels) {
    throw new MediaQuarantineError("IMAGE_DIMENSION_LIMIT");
  }

  const normalized = decoder.rotate();
  const watermark = escapedWatermark(settings);
  const variants = await Promise.all(Object.entries(WEBP_VARIANTS).map(async ([name, spec]) => {
    let pipeline = normalized.clone().resize({ width: spec.width, height: spec.width, fit: "inside", withoutEnlargement: true });
    if (watermark && name === "large") pipeline = pipeline.composite([{ input: watermark, gravity: "southeast" }]);
    const webp = await pipeline.clone().webp({ quality: spec.quality }).toBuffer();
    const avif = settings.generate_avif_derivatives
      ? await pipeline.clone().avif({ quality: Math.max(45, spec.quality - 18), effort: 4 }).toBuffer()
      : null;
    return { name: name as keyof typeof WEBP_VARIANTS, webp, avif };
  }));
  const largeInfo = await sharp(variants.find((item) => item.name === "large")!.webp).metadata();
  const width = largeInfo.width!;
  const height = largeInfo.height!;
  const placeholder = await normalized.clone().resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const takenAt = await readCaptureDate(buffer, settings.preserve_image_capture_date).catch(() => null);
  return {
    contentHash: createHash("sha256").update(buffer).digest("hex"),
    width,
    height,
    aspectRatio: Number((width / height).toFixed(6)),
    orientation: orientation(width, height),
    takenAt,
    metadataStatus: takenAt ? "extracted" : "fallback",
    blurhash: encode(new Uint8ClampedArray(placeholder.data), placeholder.info.width, placeholder.info.height, 4, 3),
    variants,
  };
}
