export const deliveryGrantRefreshLeewayMs = 30_000;

export function isDeliveryGrantFresh(expiresAt: number, now = Date.now()) {
  return expiresAt - now > deliveryGrantRefreshLeewayMs;
}

export function deliveryGrantRefreshDelay(expiresAt: number, now = Date.now()) {
  return Math.max(0, expiresAt - now - deliveryGrantRefreshLeewayMs);
}
