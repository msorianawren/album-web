import {
  assistantCharacterIds,
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantCharacter,
} from "./mascots.ts";

export type CompanionPresence = "hidden" | "on_demand" | "contextual" | "dock";
export type CompanionHelpLevel = "essential" | "helpful" | "proactive";
export type CompanionMotion = "still" | "gentle" | "lively";
export type CompanionPreset = "hidden" | "on_demand" | "helpful" | "playful" | "custom";

/** The pre-v2 type is retained only to make migration explicit at the boundary. */
export type LegacyAssistantMode = "off" | "quiet" | "helpful" | "expressive";
export type LegacyAssistantMotion = "reduced" | "standard" | "playful";

export interface AssistantPreferences {
  version: 2;
  character: AssistantCharacter;
  presence: CompanionPresence;
  helpLevel: CompanionHelpLevel;
  motion: CompanionMotion;
  soundEnabled: boolean;
  loadingFeedbackEnabled: boolean;
  contextHintsEnabled: boolean;
  idleReactionsEnabled: boolean;
}

export interface CompanionRuntimeBehavior {
  runtimeEnabled: boolean;
  manualTriggerEnabled: boolean;
  persistentDockEnabled: boolean;
  contextualGuidanceEnabled: boolean;
  loadingFeedbackEnabled: boolean;
  idleReactionsEnabled: boolean;
  soundEnabled: boolean;
  motion: CompanionMotion;
}

export const ASSISTANT_PREFERENCES_STORAGE_KEY = "oriana.assistant.preferences.v2";
export const LEGACY_ASSISTANT_PREFERENCES_STORAGE_KEY = "oriana.assistant.preferences.v1";
export const ASSISTANT_PREFERENCES_EVENT = "oriana-assistant-preferences-change";
export const ASSISTANT_PROFILE_METADATA_KEY = "assistant_preferences";

export const assistantCharacters = assistantCharacterIds;
export const companionPresences = ["hidden", "on_demand", "contextual", "dock"] as const;
export const companionHelpLevels = ["essential", "helpful", "proactive"] as const;
export const companionMotions = ["still", "gentle", "lively"] as const;
export const companionPresetIds = ["hidden", "on_demand", "helpful", "playful"] as const;

export const defaultAssistantPreferences: AssistantPreferences = {
  version: 2,
  character: DEFAULT_ASSISTANT_CHARACTER,
  presence: "on_demand",
  helpLevel: "essential",
  motion: "gentle",
  soundEnabled: false,
  loadingFeedbackEnabled: false,
  contextHintsEnabled: false,
  idleReactionsEnabled: false,
};

export const companionPresetCopy: Record<Exclude<CompanionPreset, "custom">, {
  label: string;
  outcome: string;
  visibility: string;
  guidance: string;
  motion: string;
  sound: string;
  example: string;
}> = {
  hidden: {
    label: "Hidden",
    outcome: "Keep Companion completely out of view.",
    visibility: "Nowhere outside settings",
    guidance: "No hints or reactions",
    motion: "Still",
    sound: "Off",
    example: "Album browsing stays entirely Companion-free.",
  },
  on_demand: {
    label: "On demand",
    outcome: "Only appear when you deliberately open Companion.",
    visibility: "User menu or another explicit trigger",
    guidance: "Answers fixed website questions",
    motion: "Gentle",
    sound: "Off",
    example: "Open it from the user menu to ask about a private album.",
  },
  helpful: {
    label: "Helpful",
    outcome: "Offer restrained help when a site state needs attention.",
    visibility: "During qualifying guidance, wait, or recovery moments",
    guidance: "Forms, access, recoverable errors, and longer waits",
    motion: "Gentle",
    sound: "Off",
    example: "A recoverable download problem can offer a short next step.",
  },
  playful: {
    label: "Playful",
    outcome: "Stay visibly available on supported pages without interrupting work.",
    visibility: "A compact lower-corner dock",
    guidance: "Proactive, privacy-safe website help",
    motion: "Lively",
    sound: "Off until you enable it",
    example: "A small dock is ready between albums, but sleeps in the viewer and games.",
  },
};

export const companionPresenceCopy: Record<CompanionPresence, { label: string; description: string }> = {
  hidden: { label: "Hidden", description: "No runtime entry outside settings." },
  on_demand: { label: "On demand", description: "Only an explicit menu or page trigger can open it." },
  contextual: { label: "Contextual", description: "Appears only for qualifying guidance, waits, and recovery states." },
  dock: { label: "Dock", description: "Stays available in the lower corner on supported pages." },
};

export const companionHelpLevelCopy: Record<CompanionHelpLevel, { label: string; description: string }> = {
  essential: { label: "Essential", description: "Answers only when you ask." },
  helpful: { label: "Helpful", description: "Can surface important form, access, and recovery guidance." },
  proactive: { label: "Proactive", description: "Can offer privacy-safe next steps where appropriate." },
};

export const companionMotionCopy: Record<CompanionMotion, { label: string; description: string }> = {
  still: { label: "Still", description: "No decorative movement, even when your device allows motion." },
  gentle: { label: "Gentle", description: "Short, restrained breathing and feedback motion." },
  lively: { label: "Lively", description: "Richer expressions and deliberate reactions; it does not change visibility or help." },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAssistantCharacter(value: unknown): value is AssistantCharacter {
  return typeof value === "string" && assistantCharacterIds.includes(value as AssistantCharacter);
}

function isOneOf<const Values extends readonly string[]>(value: unknown, values: Values): value is Values[number] {
  return typeof value === "string" && values.includes(value as Values[number]);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function legacyMotionToV2(motion: unknown): CompanionMotion {
  if (motion === "reduced") return "still";
  if (motion === "playful") return "lively";
  return "gentle";
}

export function migrateLegacyAssistantPreferences(value: unknown): AssistantPreferences {
  if (!isRecord(value)) return defaultAssistantPreferences;
  const mode = value.mode as LegacyAssistantMode;
  const motion = legacyMotionToV2(value.motion);
  const character = isAssistantCharacter(value.character)
    ? value.character
    : defaultAssistantPreferences.character;

  if (mode === "off") {
    return {
      ...defaultAssistantPreferences,
      character,
      presence: "hidden",
      motion: "still",
    };
  }

  if (mode === "helpful") {
    return {
      version: 2,
      character,
      presence: "contextual",
      helpLevel: "helpful",
      motion,
      soundEnabled: readBoolean(value.soundEnabled, false),
      loadingFeedbackEnabled: readBoolean(value.loadingPetEnabled, true),
      contextHintsEnabled: readBoolean(value.contextHintsEnabled, true),
      idleReactionsEnabled: false,
    };
  }

  if (mode === "expressive") {
    return {
      version: 2,
      character,
      presence: "dock",
      helpLevel: "proactive",
      motion,
      soundEnabled: readBoolean(value.soundEnabled, false),
      loadingFeedbackEnabled: readBoolean(value.loadingPetEnabled, true),
      contextHintsEnabled: readBoolean(value.contextHintsEnabled, true),
      idleReactionsEnabled: true,
    };
  }

  return {
    version: 2,
    character,
    presence: "on_demand",
    helpLevel: "essential",
    motion,
    soundEnabled: readBoolean(value.soundEnabled, false),
    loadingFeedbackEnabled: readBoolean(value.loadingPetEnabled, true),
    contextHintsEnabled: false,
    idleReactionsEnabled: false,
  };
}

export function normalizeAssistantPreferences(value: unknown): AssistantPreferences {
  if (!isRecord(value)) return defaultAssistantPreferences;
  if (value.version !== 2 && ("mode" in value || "loadingPetEnabled" in value)) {
    return migrateLegacyAssistantPreferences(value);
  }

  return {
    version: 2,
    character: isAssistantCharacter(value.character)
      ? value.character
      : defaultAssistantPreferences.character,
    presence: isOneOf(value.presence, companionPresences)
      ? value.presence
      : defaultAssistantPreferences.presence,
    helpLevel: isOneOf(value.helpLevel, companionHelpLevels)
      ? value.helpLevel
      : defaultAssistantPreferences.helpLevel,
    motion: isOneOf(value.motion, companionMotions) ? value.motion : defaultAssistantPreferences.motion,
    soundEnabled: readBoolean(value.soundEnabled, defaultAssistantPreferences.soundEnabled),
    loadingFeedbackEnabled: readBoolean(
      value.loadingFeedbackEnabled,
      defaultAssistantPreferences.loadingFeedbackEnabled,
    ),
    contextHintsEnabled: readBoolean(
      value.contextHintsEnabled,
      defaultAssistantPreferences.contextHintsEnabled,
    ),
    idleReactionsEnabled: readBoolean(
      value.idleReactionsEnabled,
      defaultAssistantPreferences.idleReactionsEnabled,
    ),
  };
}

export function preferencesForPreset(
  preset: Exclude<CompanionPreset, "custom">,
  character: AssistantCharacter = DEFAULT_ASSISTANT_CHARACTER,
): AssistantPreferences {
  const common = { version: 2 as const, character, soundEnabled: false };
  switch (preset) {
    case "hidden":
      return { ...common, presence: "hidden", helpLevel: "essential", motion: "still", loadingFeedbackEnabled: false, contextHintsEnabled: false, idleReactionsEnabled: false };
    case "helpful":
      return { ...common, presence: "contextual", helpLevel: "helpful", motion: "gentle", loadingFeedbackEnabled: true, contextHintsEnabled: true, idleReactionsEnabled: false };
    case "playful":
      return { ...common, presence: "dock", helpLevel: "proactive", motion: "lively", loadingFeedbackEnabled: true, contextHintsEnabled: true, idleReactionsEnabled: true };
    case "on_demand":
      return { ...common, presence: "on_demand", helpLevel: "essential", motion: "gentle", loadingFeedbackEnabled: false, contextHintsEnabled: false, idleReactionsEnabled: false };
  }
}

export function getCompanionPreset(preferences: AssistantPreferences): CompanionPreset {
  const normalized = normalizeAssistantPreferences(preferences);
  return companionPresetIds.find((preset) => {
    const comparison = preferencesForPreset(preset, normalized.character);
    return (
      comparison.character === normalized.character
      && comparison.presence === normalized.presence
      && comparison.helpLevel === normalized.helpLevel
      && comparison.motion === normalized.motion
      && comparison.soundEnabled === normalized.soundEnabled
      && comparison.loadingFeedbackEnabled === normalized.loadingFeedbackEnabled
      && comparison.contextHintsEnabled === normalized.contextHintsEnabled
      && comparison.idleReactionsEnabled === normalized.idleReactionsEnabled
    );
  }) ?? "custom";
}

export function resolveCompanionRuntimeBehavior(
  preferences: AssistantPreferences,
  { reducedMotion = false }: { reducedMotion?: boolean } = {},
): CompanionRuntimeBehavior {
  const normalized = normalizeAssistantPreferences(preferences);
  const runtimeEnabled = normalized.presence !== "hidden";
  const allowsGuidance = normalized.helpLevel !== "essential";
  return {
    runtimeEnabled,
    manualTriggerEnabled: runtimeEnabled,
    persistentDockEnabled: runtimeEnabled && normalized.presence === "dock",
    contextualGuidanceEnabled:
      runtimeEnabled
      && allowsGuidance
      && normalized.contextHintsEnabled
      && (normalized.presence === "contextual" || normalized.presence === "dock"),
    loadingFeedbackEnabled: runtimeEnabled && normalized.loadingFeedbackEnabled,
    idleReactionsEnabled: runtimeEnabled && normalized.presence === "dock" && normalized.idleReactionsEnabled,
    soundEnabled: runtimeEnabled && normalized.soundEnabled,
    motion: reducedMotion ? "still" : normalized.motion,
  };
}

export function readAssistantPreferencesFromStorage() {
  if (typeof window === "undefined") return defaultAssistantPreferences;
  try {
    const v2 = window.localStorage.getItem(ASSISTANT_PREFERENCES_STORAGE_KEY);
    if (v2) return normalizeAssistantPreferences(JSON.parse(v2));
    const legacy = window.localStorage.getItem(LEGACY_ASSISTANT_PREFERENCES_STORAGE_KEY);
    return legacy ? migrateLegacyAssistantPreferences(JSON.parse(legacy)) : defaultAssistantPreferences;
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
    "version", "character", "presence", "helpLevel", "motion", "soundEnabled",
    "loadingFeedbackEnabled", "contextHintsEnabled", "idleReactionsEnabled",
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
