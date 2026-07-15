import { timingSafeEqual } from "node:crypto";

export function isValidWorkerAuthorization(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
) {
  if (!authorizationHeader || !expectedSecret) return false;
  const actualBuffer = Buffer.from(authorizationHeader);
  const expectedBuffer = Buffer.from(`Bearer ${expectedSecret}`);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
