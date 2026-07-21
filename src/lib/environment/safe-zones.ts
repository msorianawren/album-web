export interface SafeZone {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  type: "hero" | "navigation" | "cta" | "oriana";
}

// These are mock definitions based on the user prompt requirements.
// In a real layout, these would be populated dynamically by the components themselves via context or a store.
export const DEFAULT_SAFE_ZONES: SafeZone[] = [
  { id: "face", left: 0, top: 0, width: 0, height: 0, type: "hero" }, // Placeholder for dynamic update
  { id: "ask-oriana", left: 0, top: 0, width: 0, height: 0, type: "oriana" },
];

export function isInSafeZone(x: number, y: number, zones: SafeZone[]): boolean {
  return zones.some(
    (zone) => x >= zone.left && x <= zone.left + zone.width && y >= zone.top && y <= zone.top + zone.height
  );
}
