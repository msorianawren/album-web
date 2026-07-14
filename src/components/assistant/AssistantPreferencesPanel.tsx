"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import { Button } from "@/components/ui/Button";
import { useAssistantPreferences } from "@/hooks/useAssistantPreferences";
import {
  assistantModeCopy,
  assistantModes,
  assistantMotionCopy,
  assistantMotions,
} from "@/lib/assistant/preferences";
import {
  assistantCharacterIds,
  assistantMascotGroupLabels,
  assistantMascots,
  assistantMoodLabels,
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantMascotGroup,
  type AssistantMood,
} from "@/lib/assistant/mascots";
import { cn } from "@/lib/utils";

interface AssistantPreferencesPanelProps {
  userId?: string | null;
  initialPreferences?: unknown;
}

const mascotGroupOrder: AssistantMascotGroup[] = ["animals", "chibi_roles"];

const previewMoods: AssistantMood[] = [
  "idle",
  "qa",
  "shy",
  "sad",
  "celebrate",
  "loading_dance",
];

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.1rem] border border-border bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-8 w-14 shrink-0 rounded-full border border-border bg-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[checked=true]:bg-accent"
        data-checked={checked}
      >
        <span
          className={cn(
            "absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-text-primary text-background transition-transform",
            checked && "translate-x-6",
          )}
        >
          {checked ? <Check className="h-3 w-3" /> : null}
        </span>
      </button>
    </div>
  );
}

export function AssistantPreferencesPanel({
  userId,
  initialPreferences,
}: AssistantPreferencesPanelProps) {
  const [previewMood, setPreviewMood] = useState<AssistantMood>("idle");
  const [characterSearch, setCharacterSearch] = useState("");
  const {
    preferences,
    updatePreference,
    resetToDefaults,
    save,
    dirty,
    saveState,
    error,
  } = useAssistantPreferences({ userId, initialPreferences });

  const selectedMascot =
    assistantMascots[preferences.character] ?? assistantMascots[DEFAULT_ASSISTANT_CHARACTER];
  const previewMoodForMotion = preferences.motion === "reduced" ? "idle" : previewMood;

  const visibleCharacterIds = useMemo(() => {
    const query = characterSearch.trim().toLowerCase();
    if (!query) return assistantCharacterIds;

    return assistantCharacterIds.filter((id) => {
      const mascot = assistantMascots[id];
      return [
        id.replaceAll("_", " "),
        mascot.name,
        mascot.personalityLabel,
        mascot.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [characterSearch]);

  return (
    <section
      id="oriana-companion"
      className="rounded-[1.4rem] border border-border bg-surface/65 p-5 shadow-xl shadow-text-primary/5 backdrop-blur-xl md:p-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
            Assistant
          </p>
          <h2 className="mt-2 text-2xl font-serif italic text-text-primary">
            Oriana Companion
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Choose a quiet helper for album access, contact guidance, form hints, and gentle loading feedback.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={resetToDefaults}
            aria-label="Reset assistant preferences to defaults"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saveState === "saving"}>
            {saveState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-[1.2rem] border border-border bg-background/45 px-4 py-3 text-xs text-text-secondary">
        {saveState === "saved" && !dirty ? "Saved." : dirty ? "Unsaved changes." : "Ready."}
        {userId ? " Preferences sync to your account." : " Guest preferences stay on this device."}
        {error ? <span className="ml-2 text-red-500">{error}</span> : null}
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-border bg-background/45 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        Oriana Companion answers basic site questions from fixed website rules. It is not a human,
        cannot approve private access, and will hand off to Contact when it is unsure.
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-7">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Character</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {visibleCharacterIds.length} of {assistantCharacterIds.length} companions shown.
                </p>
              </div>
              <label className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                  aria-hidden="true"
                />
                <span className="sr-only">Search assistant characters</span>
                <input
                  value={characterSearch}
                  onChange={(event) => setCharacterSearch(event.target.value)}
                  placeholder="Search companions"
                  className="h-11 w-full rounded-full border border-border bg-background/70 pl-10 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <div className="mt-4 space-y-5">
              {mascotGroupOrder.map((group) => {
                const groupCharacterIds = visibleCharacterIds.filter(
                  (id) => assistantMascots[id].group === group,
                );
                if (groupCharacterIds.length === 0) return null;

                return (
                  <div key={group}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                        {assistantMascotGroupLabels[group]}
                      </p>
                      <span className="rounded-full border border-border bg-background/65 px-2.5 py-1 text-[0.68rem] text-text-secondary">
                        {groupCharacterIds.length}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                      {groupCharacterIds.map((characterId) => {
                        const mascot = assistantMascots[characterId];
                        const selected = preferences.character === characterId;
                        return (
                          <button
                            key={characterId}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => updatePreference("character", characterId)}
                            className={cn(
                              "group min-h-36 rounded-[1.2rem] border bg-background/55 p-3 text-left transition hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? "border-accent shadow-lg shadow-text-primary/10"
                                : "border-border",
                            )}
                          >
                            <span className="flex h-16 w-16 items-center justify-center rounded-[1.1rem] border border-border bg-surface/75">
                              {/* Static card previews stay as public img assets and avoid 20 animated pets. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mascot.src}
                                alt=""
                                width={48}
                                height={48}
                                loading="lazy"
                                decoding="async"
                                className="h-12 w-12 object-contain"
                              />
                            </span>
                            <span className="mt-3 block text-sm font-semibold text-text-primary">
                              {mascot.name}
                            </span>
                            <span className="mt-1 block text-xs text-text-secondary">
                              {mascot.personalityLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-text-primary">Assistant mode</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {assistantModes.map((mode) => {
                const selected = preferences.mode === mode;
                const copy = assistantModeCopy[mode];
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updatePreference("mode", mode)}
                    className={cn(
                      "rounded-[1.1rem] border bg-background/55 p-4 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-accent" : "border-border",
                    )}
                  >
                    <span className="text-sm font-semibold text-text-primary">{copy.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                      {copy.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-text-primary">Motion</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {assistantMotions.map((motion) => {
                const selected = preferences.motion === motion;
                const copy = assistantMotionCopy[motion];
                return (
                  <button
                    key={motion}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updatePreference("motion", motion)}
                    className={cn(
                      "rounded-[1.1rem] border bg-background/55 p-4 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-accent" : "border-border",
                    )}
                  >
                    <span className="text-sm font-semibold text-text-primary">{copy.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                      {copy.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <ToggleRow
              title="Soft assistant sounds"
              description="Sounds are optional and never required to understand the site."
              checked={preferences.soundEnabled}
              onChange={(checked) => updatePreference("soundEnabled", checked)}
            />
            <ToggleRow
              title="Use assistant loading animation for longer waits."
              description="Reserved for longer feedback moments; short page actions stay quiet."
              checked={preferences.loadingPetEnabled}
              onChange={(checked) => updatePreference("loadingPetEnabled", checked)}
            />
            <ToggleRow
              title="Show small hints when a form or action needs attention."
              description="Context hints stay lightweight and avoid private album or message content."
              checked={preferences.contextHintsEnabled}
              onChange={(checked) => updatePreference("contextHintsEnabled", checked)}
            />
          </div>
        </div>

        <aside className="rounded-[1.4rem] border border-border bg-background/55 p-5 text-center xl:sticky xl:top-24 xl:self-start">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] border border-border bg-surface/70">
            {preferences.mode === "off" ? (
              <VolumeX className="h-12 w-12 text-text-secondary" aria-hidden="true" />
            ) : (
              <AssistantPet
                character={selectedMascot.id}
                mood={previewMoodForMotion}
                label={`${selectedMascot.name} preview`}
                size="lg"
              />
            )}
          </div>
          <p className="mt-4 text-sm font-semibold text-text-primary">
            {preferences.mode === "off" ? "Assistant hidden" : selectedMascot.name}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
            {preferences.mode === "off" ? "Off" : selectedMascot.personalityLabel}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-text-secondary">
            {preferences.mode === "off"
              ? "The companion will stay out of view until you turn it back on."
              : selectedMascot.description}
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {previewMoods.map((mood) => (
              <button
                key={mood}
                type="button"
                disabled={preferences.motion === "reduced" || preferences.mode === "off"}
                aria-pressed={previewMood === mood}
                onClick={() => setPreviewMood(mood)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
                  previewMood === mood
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface/70 text-text-secondary hover:text-text-primary",
                )}
              >
                {assistantMoodLabels[mood]}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-secondary">
            {preferences.soundEnabled ? (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              Companion: {assistantModeCopy[preferences.mode].label}
            </span>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
        </aside>
      </div>
    </section>
  );
}
