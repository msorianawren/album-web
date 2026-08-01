export interface AdminStoriesSettingsValue { enabled: boolean; eyebrow: string; heading: string }

function clean(value: unknown, fallback: string, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function normalizeAdminStoriesSettingsValue(value: unknown, defaults: AdminStoriesSettingsValue): AdminStoriesSettingsValue {
  const saved = typeof value === "object" && value !== null ? value as Partial<AdminStoriesSettingsValue> : {};
  return { enabled: saved.enabled === true, eyebrow: clean(saved.eyebrow, defaults.eyebrow, 80), heading: clean(saved.heading, defaults.heading, 140) };
}
