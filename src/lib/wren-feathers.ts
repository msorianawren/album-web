export const DEFAULT_PRIVATE_ALBUM_FEATHER_PRICE = 150;
const MIN_FEATHER_PRICE = 1;
const MAX_FEATHER_PRICE = 100_000;

export function normalizeFeatherPrice(
  value: unknown,
  fallback = DEFAULT_PRIVATE_ALBUM_FEATHER_PRICE,
) {
  const price = typeof value === "number" ? value : Number(value);
  return Number.isInteger(price) && price >= MIN_FEATHER_PRICE && price <= MAX_FEATHER_PRICE
    ? price
    : fallback;
}

export function getEffectiveFeatherPrice(albumPrice: unknown, defaultPrice: unknown) {
  return normalizeFeatherPrice(
    albumPrice,
    normalizeFeatherPrice(defaultPrice),
  );
}
