"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ASSISTANT_PREFERENCES_EVENT,
  defaultAssistantPreferences,
  normalizeAssistantPreferences,
  readAssistantPreferencesFromStorage,
  writeAssistantPreferencesToStorage,
  type AssistantPreferences,
} from "@/lib/assistant/preferences";

interface UseAssistantPreferencesOptions {
  userId?: string | null;
  initialPreferences?: unknown;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function samePreferences(left: AssistantPreferences, right: AssistantPreferences) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useAssistantPreferences({
  userId = null,
  initialPreferences,
}: UseAssistantPreferencesOptions = {}) {
  const getInitialPreferences = () =>
    userId
      ? normalizeAssistantPreferences(initialPreferences)
      : readAssistantPreferencesFromStorage();
  const [preferences, setPreferences] = useState<AssistantPreferences>(getInitialPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<AssistantPreferences>(getInitialPreferences);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = !samePreferences(preferences, savedPreferences);

  const updatePreference = useCallback(
    <Key extends keyof AssistantPreferences>(key: Key, value: AssistantPreferences[Key]) => {
      setPreferences((current) => ({
        ...current,
        [key]: value,
      }));
      setSaveState("idle");
      setError(null);
    },
    [],
  );

  const resetToDefaults = useCallback(() => {
    setPreferences(defaultAssistantPreferences);
    setSaveState("idle");
    setError(null);
  }, []);

  const save = useCallback(async () => {
    const nextPreferences = normalizeAssistantPreferences(preferences);
    setSaveState("saving");
    setError(null);
    writeAssistantPreferencesToStorage(nextPreferences);

    try {
      if (userId) {
        const response = await fetch("/api/profile/assistant-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextPreferences),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : "Assistant preferences could not be saved.";
          setSaveState("error");
          setError(message);
          return false;
        }
      }
    } catch {
      setSaveState("error");
      setError("Network error while saving assistant preferences.");
      return false;
    }

    setPreferences(nextPreferences);
    setSavedPreferences(nextPreferences);
    setSaveState("saved");
    return true;
  }, [preferences, userId]);

  return {
    preferences,
    updatePreference,
    resetToDefaults,
    save,
    dirty,
    saveState,
    error,
  };
}

export function useStoredAssistantPreferences() {
  const [preferences, setPreferences] = useState(defaultAssistantPreferences);

  useEffect(() => {
    const sync = () => setPreferences(readAssistantPreferencesFromStorage());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ASSISTANT_PREFERENCES_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ASSISTANT_PREFERENCES_EVENT, sync);
    };
  }, []);

  return preferences;
}
