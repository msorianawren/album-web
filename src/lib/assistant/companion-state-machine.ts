export const companionStates = [
  "idle",
  "listening",
  "thinking",
  "answering",
  "waiting",
  "success",
  "celebration",
  "warning",
  "error",
  "unavailable",
  "sleeping",
] as const;

export type CompanionState = (typeof companionStates)[number];

export type CompanionEvent =
  | "panel_opened"
  | "panel_closed"
  | "user_typing"
  | "answer_lookup_started"
  | "answer_found"
  | "answer_unknown"
  | "contact_handoff_offered"
  | "form_invalid"
  | "operation_pending"
  | "operation_succeeded"
  | "operation_failed"
  | "access_unavailable"
  | "idle_timeout"
  | "pet"
  | "reset";

export interface CompanionStateDefinition {
  priority: number;
  minDurationMs: number;
  maxDurationMs: number;
  announces: boolean;
  label: string;
}

export interface CompanionStateSnapshot {
  state: CompanionState;
  since: number;
}

export const companionStateDefinitions: Record<CompanionState, CompanionStateDefinition> = {
  idle: { priority: 0, minDurationMs: 0, maxDurationMs: 20_000, announces: false, label: "Resting" },
  listening: { priority: 20, minDurationMs: 250, maxDurationMs: 5_000, announces: false, label: "Listening" },
  thinking: { priority: 30, minDurationMs: 350, maxDurationMs: 12_000, announces: false, label: "Thinking" },
  answering: { priority: 35, minDurationMs: 800, maxDurationMs: 12_000, announces: true, label: "Answering" },
  waiting: { priority: 45, minDurationMs: 900, maxDurationMs: 20_000, announces: true, label: "Waiting" },
  success: { priority: 60, minDurationMs: 900, maxDurationMs: 8_000, announces: true, label: "Success" },
  celebration: { priority: 55, minDurationMs: 900, maxDurationMs: 6_000, announces: false, label: "Celebration" },
  warning: { priority: 80, minDurationMs: 1_800, maxDurationMs: 15_000, announces: true, label: "Needs attention" },
  error: { priority: 100, minDurationMs: 2_500, maxDurationMs: 20_000, announces: true, label: "Error" },
  unavailable: { priority: 85, minDurationMs: 1_800, maxDurationMs: 15_000, announces: true, label: "Unavailable" },
  sleeping: { priority: 5, minDurationMs: 0, maxDurationMs: 60_000, announces: false, label: "Resting quietly" },
};

const eventState: Record<CompanionEvent, CompanionState> = {
  panel_opened: "listening",
  panel_closed: "idle",
  user_typing: "listening",
  answer_lookup_started: "thinking",
  answer_found: "answering",
  answer_unknown: "unavailable",
  contact_handoff_offered: "warning",
  form_invalid: "warning",
  operation_pending: "waiting",
  operation_succeeded: "success",
  operation_failed: "error",
  access_unavailable: "unavailable",
  idle_timeout: "sleeping",
  pet: "celebration",
  reset: "idle",
};

export function resolveCompanionTransition(
  current: CompanionStateSnapshot,
  event: CompanionEvent,
  now = Date.now(),
): CompanionStateSnapshot {
  const next = eventState[event];
  if (event === "reset" || next === current.state) {
    return next === current.state ? current : { state: next, since: now };
  }

  const currentDefinition = companionStateDefinitions[current.state];
  const nextDefinition = companionStateDefinitions[next];
  const visibleFor = Math.max(0, now - current.since);
  if (
    visibleFor < currentDefinition.minDurationMs
    && nextDefinition.priority < currentDefinition.priority
  ) {
    return current;
  }
  return { state: next, since: now };
}

export function shouldAnnounceCompanionState(state: CompanionState) {
  return companionStateDefinitions[state].announces;
}

export function companionStateMicrocopy(state: CompanionState) {
  const copy: Record<CompanionState, string> = {
    idle: "Ready when you need website help.",
    listening: "Listening for a website question.",
    thinking: "Checking the website guidance.",
    answering: "A clear next step is ready.",
    waiting: "This is taking a little longer than usual.",
    success: "That step is complete.",
    celebration: "A small moment worth celebrating.",
    warning: "This step may need your attention.",
    error: "That did not work. A safe next step is available.",
    unavailable: "Companion cannot complete that request.",
    sleeping: "Companion is resting until you call for help.",
  };
  return copy[state];
}
