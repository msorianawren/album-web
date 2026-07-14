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
  return ["avif", "avis", "mif1", "msf1"].includes(getIsoBrand(buffer));
}

function isMp4(buffer: Buffer) {
  return ["isom", "iso2", "mp41", "mp42", "M4V ", "M4A ", "qt  "].includes(getIsoBrand(buffer));
}

function isWebm(buffer: Buffer) {
  return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

export function hasExpectedUploadSignature(mimeType: string, buffer: Buffer) {
  if (mimeType === "image/jpeg") return isJpeg(buffer);
  if (mimeType === "image/png") return isPng(buffer);
  if (mimeType === "image/webp") return isWebp(buffer);
  if (mimeType === "image/avif") return isAvif(buffer);
  if (mimeType === "video/mp4") return isMp4(buffer);
  if (mimeType === "video/quicktime") return getIsoBrand(buffer) === "qt  " || isMp4(buffer);
  if (mimeType === "video/webm") return isWebm(buffer);
  return false;
}

export function detectImageMimeFromMagicBytes(buffer: Buffer) {
  if (isJpeg(buffer)) return "image/jpeg" as const;
  if (isPng(buffer)) return "image/png" as const;
  if (isWebp(buffer)) return "image/webp" as const;
  if (isAvif(buffer)) return "image/avif" as const;
  return null;
}
