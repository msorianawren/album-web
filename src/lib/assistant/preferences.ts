import {
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantCharacter,
} from "@/lib/assistant/mascots";

export type AssistantMode = "off" | "quiet" | "helpful" | "expressive";
export type AssistantMotion = "reduced" | "standard" | "playful";

export interface AssistantPreferences {
  character: AssistantCharacter;
  mode: AssistantMode;
  motion: AssistantMotion;
  soundEnabled: boolean;
  loadingPetEnabled: boolean;
  contextHintsEnabled: boolean;
}

export const ASSISTANT_PREFERENCES_STORAGE_KEY = "oriana.assistant.preferences.v1";
export const ASSISTANT_PREFERENCES_EVENT = "oriana-assistant-preferences-change";
export const ASSISTANT_PROFILE_METADATA_KEY = "assistant_preferences";

export const assistantCharacters = ["capybara", "fox", "owl"] as const;
export const assistantModes = ["off", "quiet", "helpful", "expressive"] as const;
export const assistantMotions = ["reduced", "standard", "playful"] as const;

export const defaultAssistantPreferences: AssistantPreferences = {
  character: DEFAULT_ASSISTANT_CHARACTER,
  mode: "quiet",
  motion: "standard",
  soundEnabled: false,
  loadingPetEnabled: true,
  contextHintsEnabled: true,
};

export const assistantModeCopy: Record<AssistantMode, { label: string; description: string }> = {
  off: {
    label: "Off",
    description: "Hide the assistant.",
  },
  quiet: {
    label: "Quiet",
    description: "Only show important hints.",
  },
  helpful: {
    label: "Helpful",
    description: "Show form and access guidance when useful.",
  },
  expressive: {
    label: "Expressive",
    description: "Add subtle emotional feedback for success, errors, and loading.",
  },
};

export const assistantMotionCopy: Record<AssistantMotion, { label: string; description: string }> = {
  reduced: {
    label: "Reduced",
    description: "Minimal movement.",
  },
  standard: {
    label: "Standard",
    description: "Soft motion.",
  },
  playful: {
    label: "Playful",
    description: "More expressive, still lightweight.",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAssistantCharacter(value: unknown): value is AssistantCharacter {
  return typeof value === "string" && assistantCharacters.includes(value as AssistantCharacter);
}

function isAssistantMode(value: unknown): value is AssistantMode {
  return typeof value === "string" && assistantModes.includes(value as AssistantMode);
}

function isAssistantMotion(value: unknown): value is AssistantMotion {
  return typeof value === "string" && assistantMotions.includes(value as AssistantMotion);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeAssistantPreferences(value: unknown): AssistantPreferences {
  if (!isRecord(value)) return defaultAssistantPreferences;

  return {
    character: isAssistantCharacter(value.character)
      ? value.character
      : defaultAssistantPreferences.character,
    mode: isAssistantMode(value.mode) ? value.mode : defaultAssistantPreferences.mode,
    motion: isAssistantMotion(value.motion) ? value.motion : defaultAssistantPreferences.motion,
    soundEnabled: readBoolean(value.soundEnabled, defaultAssistantPreferences.soundEnabled),
    loadingPetEnabled: readBoolean(
      value.loadingPetEnabled,
      defaultAssistantPreferences.loadingPetEnabled,
    ),
    contextHintsEnabled: readBoolean(
      value.contextHintsEnabled,
      defaultAssistantPreferences.contextHintsEnabled,
    ),
  };
}

export function readAssistantPreferencesFromStorage() {
  if (typeof window === "undefined") return defaultAssistantPreferences;

  try {
    const raw = window.localStorage.getItem(ASSISTANT_PREFERENCES_STORAGE_KEY);
    return raw ? normalizeAssistantPreferences(JSON.parse(raw)) : defaultAssistantPreferences;
  } catch {
    return defaultAssistantPreferences;
  }
}

export function writeAssistantPreferencesToStorage(preferences: AssistantPreferences) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      ASSISTANT_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeAssistantPreferences(preferences)),
    );
    window.dispatchEvent(new Event(ASSISTANT_PREFERENCES_EVENT));
  } catch {
    // Browser storage can be unavailable in strict privacy modes; preferences still work in memory.
  }
}

export function hasOnlyAssistantPreferenceKeys(value: unknown) {
  if (!isRecord(value)) return false;

  const allowedKeys = new Set([
    "character",
    "mode",
    "motion",
    "soundEnabled",
    "loadingPetEnabled",
    "contextHintsEnabled",
  ]);

  return Object.keys(value).every((key) => allowedKeys.has(key));
}

export function getAssistantPreferencesFromMetadata(metadata: unknown) {
  if (!isRecord(metadata)) return defaultAssistantPreferences;
  return normalizeAssistantPreferences(metadata[ASSISTANT_PROFILE_METADATA_KEY]);
}

export function mergeAssistantPreferencesIntoMetadata(
  metadata: unknown,
  preferences: AssistantPreferences,
) {
  const safeMetadata = isRecord(metadata) ? metadata : {};
  return {
    ...safeMetadata,
    [ASSISTANT_PROFILE_METADATA_KEY]: normalizeAssistantPreferences(preferences),
  };
}
