import assert from "node:assert/strict";
import test from "node:test";
import {
  deliveryGrantRefreshDelay,
  deliveryGrantRefreshLeewayMs,
  isDeliveryGrantFresh,
} from "../src/lib/media/delivery-grant-cache.ts";

test("delivery grants refresh before expiry and reject an expired cache entry", () => {
  const now = 1_000_000;
  const expiresAt = now + 120_000;

  assert.equal(isDeliveryGrantFresh(expiresAt, now), true);
  assert.equal(deliveryGrantRefreshDelay(expiresAt, now), 90_000);
  assert.equal(isDeliveryGrantFresh(now + deliveryGrantRefreshLeewayMs, now), false);
  assert.equal(deliveryGrantRefreshDelay(now - 1, now), 0);
});
