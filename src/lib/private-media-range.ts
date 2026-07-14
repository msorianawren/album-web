export function parseSingleByteRange(value: string | null) {
  if (!value) return undefined;
  return /^bytes=(?:\d+-\d*|-\d+)$/.test(value) ? value : null;
}

export function isMediaUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
