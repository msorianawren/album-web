export type EnvironmentPhase = "day" | "sunset" | "night";
export type EnvironmentPhasePreference = "auto" | EnvironmentPhase;

const DAY_START_MINUTES = 6 * 60;
const SUNSET_START_MINUTES = 16 * 60 + 30;
const NIGHT_START_MINUTES = 19 * 60;

export function resolveAutoEnvironmentPhase(date = new Date()): EnvironmentPhase {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= DAY_START_MINUTES && minutes < SUNSET_START_MINUTES) return "day";
  if (minutes >= SUNSET_START_MINUTES && minutes < NIGHT_START_MINUTES) return "sunset";
  return "night";
}

export function resolveEnvironmentPhase(
  preference: EnvironmentPhasePreference,
  date = new Date(),
): EnvironmentPhase {
  return preference === "auto" ? resolveAutoEnvironmentPhase(date) : preference;
}

export function millisecondsUntilNextPhaseBoundary(date = new Date()) {
  const next = new Date(date);
  const candidates = [DAY_START_MINUTES, SUNSET_START_MINUTES, NIGHT_START_MINUTES]
    .map((minutes) => {
      const candidate = new Date(date);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (candidate.getTime() <= date.getTime()) candidate.setDate(candidate.getDate() + 1);
      return candidate.getTime();
    });
  next.setTime(Math.min(...candidates));
  return Math.max(1_000, next.getTime() - date.getTime() + 50);
}

export function applyEnvironmentPhase(root: HTMLElement, phase: EnvironmentPhase) {
  root.dataset.environmentPhase = phase;
  root.classList.toggle("theme-day", phase === "day");
  root.classList.toggle("theme-sunset", phase === "sunset");
  root.classList.toggle("theme-night", phase === "night");
}
