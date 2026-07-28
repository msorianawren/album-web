"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Check,
  CircleHelp,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import { Button } from "@/components/ui/Button";
import { useAssistantPreferences } from "@/hooks/useAssistantPreferences";
import { getCompanionAsset, flagshipCompanionCharacterIds } from "@/lib/assistant/companion-assets";
import {
  companionStateDefinitions,
  companionStateMicrocopy,
  type CompanionState,
} from "@/lib/assistant/companion-state-machine";
import {
  DEFAULT_ASSISTANT_LOCALE,
  readSelectedAssistantLocale,
  subscribeAssistantLocale,
} from "@/lib/assistant/locales";
import {
  companionHelpLevels,
  companionMotions,
  companionPresences,
  companionPresetIds,
  getCompanionPreset,
  preferencesForPreset,
  resolveCompanionRuntimeBehavior,
} from "@/lib/assistant/preferences";
import { getCompanionSettingsCopy } from "@/lib/assistant/settings-copy";
import { playCompanionChime } from "@/lib/assistant/sound";
import { assistantMascots, DEFAULT_ASSISTANT_CHARACTER } from "@/lib/assistant/mascots";
import { cn } from "@/lib/utils";

interface AssistantPreferencesPanelProps {
  userId?: string | null;
  initialPreferences?: unknown;
}

const previewStates: CompanionState[] = [
  "idle",
  "listening",
  "thinking",
  "answering",
  "waiting",
  "success",
  "warning",
  "error",
  "celebration",
];

function subscribeToCompanionHydration() {
  return () => {};
}

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
        className="relative h-10 w-16 shrink-0 rounded-full border border-border bg-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[checked=true]:bg-accent"
        data-checked={checked}
      >
        <span
          className={cn(
            "absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-text-primary text-background transition-transform",
            checked && "translate-x-6",
          )}
        >
          {checked ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </button>
    </div>
  );
}

function ChoiceRow<T extends string>({
  value,
  options,
  copy,
  onChange,
}: {
  value: T;
  options: readonly T[];
  copy: Record<T, { label: string; description: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-24 rounded-[1rem] border bg-background/55 p-3 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-accent shadow-sm shadow-text-primary/10" : "border-border",
            )}
          >
            <span className="text-sm font-semibold text-text-primary">{copy[option].label}</span>
            <span className="mt-1 block text-xs leading-relaxed text-text-secondary">{copy[option].description}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AssistantPreferencesPanel({
  userId,
  initialPreferences,
}: AssistantPreferencesPanelProps) {
  const [previewState, setPreviewState] = useState<CompanionState>("idle");
  const {
    preferences,
    updatePreference,
    replacePreferences,
    resetToDefaults,
    save,
    dirty,
    saveState,
    error,
  } = useAssistantPreferences({ userId, initialPreferences });
  const locale = useSyncExternalStore(
    subscribeAssistantLocale,
    readSelectedAssistantLocale,
    () => DEFAULT_ASSISTANT_LOCALE,
  );
  const isInteractive = useSyncExternalStore(
    subscribeToCompanionHydration,
    () => true,
    () => false,
  );
  const copy = getCompanionSettingsCopy(locale);
  const selectedMascot = assistantMascots[preferences.character] ?? assistantMascots[DEFAULT_ASSISTANT_CHARACTER];
  const preset = getCompanionPreset(preferences);
  const behavior = resolveCompanionRuntimeBehavior(preferences);
  const previewAsset = getCompanionAsset(preferences.character, previewState);

  const summary = useMemo(() => {
    if (!behavior.runtimeEnabled) return [copy.summaryHidden];
    return [
      behavior.persistentDockEnabled ? copy.summaryDock : null,
      behavior.contextualGuidanceEnabled ? copy.summaryContextual : null,
      behavior.loadingFeedbackEnabled ? copy.summaryWait : null,
      behavior.contextualGuidanceEnabled ? copy.summaryHints : null,
      copy.summarySuspends,
      behavior.soundEnabled ? copy.soundOn : copy.soundOff,
    ].filter((item): item is string => Boolean(item));
  }, [behavior, copy]);

  const status = saveState === "saving"
    ? copy.saving
    : saveState === "saved" && !dirty
      ? copy.saved
      : dirty
        ? copy.unsaved
        : copy.saved;

  return (
    <section
      id="oriana-companion"
      className="rounded-[1.4rem] border border-border bg-surface/65 p-5 shadow-xl shadow-text-primary/5 backdrop-blur-xl md:p-8"
      aria-busy={!isInteractive}
      data-companion-hydrated={isInteractive ? "true" : "false"}
      inert={!isInteractive}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">{copy.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-serif italic text-text-primary">Oriana Companion</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">{copy.intro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={resetToDefaults} aria-label="Reset Companion preferences">
            <RotateCcw className="h-4 w-4" />
            {copy.reset}
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || saveState === "saving"}>
            {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {copy.save}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[1.2rem] border border-border bg-background/45 px-4 py-3 text-xs text-text-secondary" role="status">
        <span className={saveState === "error" ? "text-red-600" : "text-text-primary"}>{error ?? status}</span>
        <span>·</span>
        <span>{userId ? copy.account : copy.guest}</span>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{copy.choose}</h3>
            <p className="mt-1 text-xs text-text-secondary">
              {preset === "custom" ? copy.customDescription : copy.preset[preset].outcome}
            </p>
          </div>
          {preset === "custom" ? (
            <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary">{copy.custom}</span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {companionPresetIds.map((presetId) => {
            const presetCopy = copy.preset[presetId];
            const selected = preset === presetId;
            return (
              <button
                key={presetId}
                type="button"
                data-testid={`companion-preset-${presetId}`}
                aria-pressed={selected}
                onClick={() => replacePreferences(preferencesForPreset(presetId, preferences.character))}
                className={cn(
                  "group rounded-[1.25rem] border bg-background/55 p-4 text-left transition hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-accent shadow-lg shadow-text-primary/10" : "border-border",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-border bg-surface/80">
                    {presetId === "hidden" ? <EyeOff className="h-5 w-5 text-text-secondary" /> : <Sparkles className="h-5 w-5 text-muted-accent" />}
                  </span>
                  {selected ? <Check className="h-5 w-5 text-muted-accent" aria-label="Selected" /> : null}
                </span>
                <span className="mt-4 block text-base font-semibold text-text-primary">{presetCopy.label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-text-secondary">{presetCopy.outcome}</span>
                <span className="mt-4 grid gap-1.5 text-xs text-text-secondary sm:grid-cols-2">
                  <span><b className="font-semibold text-text-primary">{copy.visibility}:</b> {presetCopy.visibility}</span>
                  <span><b className="font-semibold text-text-primary">{copy.guidance}:</b> {presetCopy.guidance}</span>
                  <span><b className="font-semibold text-text-primary">{copy.motion}:</b> {presetCopy.motion}</span>
                  <span><b className="font-semibold text-text-primary">{copy.sound}:</b> {presetCopy.sound}</span>
                </span>
                <span className="mt-3 block border-t border-border pt-3 text-xs leading-relaxed text-text-secondary"><b className="font-semibold text-text-primary">{copy.example}:</b> {presetCopy.example}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{copy.character}</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-secondary">{copy.characterDescription}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {flagshipCompanionCharacterIds.map((characterId) => {
                const mascot = assistantMascots[characterId];
                const selected = preferences.character === characterId;
                return (
                  <button
                    key={characterId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updatePreference("character", characterId)}
                    className={cn(
                      "group min-h-48 min-w-0 rounded-[1.2rem] border bg-background/55 p-3 text-left transition hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-accent shadow-lg shadow-text-primary/10" : "border-border",
                    )}
                  >
                    <span className="flex h-28 w-full items-center justify-center overflow-hidden rounded-[1rem] border border-border bg-surface/75">
                      <AssistantPet character={characterId} state="idle" size="md" decorative />
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-text-primary">{mascot.name}</span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-text-secondary">{mascot.personalityLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-text-primary">{copy.advanced}</h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{copy.advancedDescription}</p>
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">{copy.visibility}</p>
                <ChoiceRow value={preferences.presence} options={companionPresences} copy={copy.presenceOptions} onChange={(presence) => updatePreference("presence", presence)} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">{copy.guidance}</p>
                <ChoiceRow value={preferences.helpLevel} options={companionHelpLevels} copy={copy.helpLevelOptions} onChange={(helpLevel) => updatePreference("helpLevel", helpLevel)} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">{copy.motion}</p>
                <ChoiceRow value={preferences.motion} options={companionMotions} copy={copy.motionOptions} onChange={(motion) => updatePreference("motion", motion)} />
              </div>
              <div className="grid gap-3">
                <ToggleRow {...copy.soundControl} checked={preferences.soundEnabled} onChange={(soundEnabled) => updatePreference("soundEnabled", soundEnabled)} />
                <ToggleRow {...copy.loadingControl} checked={preferences.loadingFeedbackEnabled} onChange={(loadingFeedbackEnabled) => updatePreference("loadingFeedbackEnabled", loadingFeedbackEnabled)} />
                <ToggleRow {...copy.hintsControl} checked={preferences.contextHintsEnabled} onChange={(contextHintsEnabled) => updatePreference("contextHintsEnabled", contextHintsEnabled)} />
                <ToggleRow {...copy.idleControl} checked={preferences.idleReactionsEnabled} onChange={(idleReactionsEnabled) => updatePreference("idleReactionsEnabled", idleReactionsEnabled)} />
              </div>
            </div>
            {preferences.presence === "hidden" ? (
              <div className="mt-4 rounded-[1.1rem] border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-text-secondary">
                <p>{copy.hiddenNote}</p>
                <p className="mt-2">{copy.applyHelpfulDescription}</p>
                <button type="button" onClick={() => replacePreferences({ ...preferences, presence: "contextual", helpLevel: "helpful", contextHintsEnabled: true })} className="mt-3 inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold text-text-primary transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.applyHelpful}</button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-[1.4rem] border border-border bg-background/55 p-5 xl:sticky xl:top-24 xl:self-start" data-companion-state={previewState}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{copy.playground}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{selectedMascot.name} · {companionStateDefinitions[previewState].label}</p>
            </div>
            {preferences.soundEnabled ? <Volume2 className="h-4 w-4 text-muted-accent" aria-label={copy.soundOn} /> : <VolumeX className="h-4 w-4 text-text-secondary" aria-label={copy.soundOff} />}
          </div>
          <button type="button" onClick={() => { setPreviewState("celebration"); if (preferences.soundEnabled) playCompanionChime(); }} className="mt-5 flex h-56 w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-border bg-surface/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Pet Companion preview">
            <AssistantPet character={preferences.character} state={previewState} motion={behavior.motion} size="lg" label={previewAsset.label} priority />
          </button>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{companionStateMicrocopy(previewState)}</p>
          <p className="mt-2 rounded-xl border border-border bg-surface/70 px-3 py-2 text-xs text-text-secondary"><span className="font-semibold text-text-primary">{copy.state}:</span> {companionStateDefinitions[previewState].label}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {previewStates.map((state) => (
              <button key={state} type="button" data-testid={`companion-preview-${state}`} aria-pressed={previewState === state} onClick={() => setPreviewState(state)} className={cn("min-h-9 rounded-full border px-3 text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", previewState === state ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface/70 text-text-secondary hover:text-text-primary")}>{companionStateDefinitions[state].label}</button>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{copy.whatYouWillSee}</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
              {summary.map((item) => <li key={item} className="flex gap-2"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-accent" aria-hidden="true" />{item}</li>)}
            </ul>
            <p className="mt-4 text-[0.68rem] uppercase tracking-[0.12em] text-text-secondary">{copy.previewsOnly}</p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-3 z-10 mt-8 flex flex-col gap-3 rounded-[1.2rem] border border-border bg-surface/95 p-3 shadow-xl shadow-text-primary/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="px-1 text-xs text-text-secondary">{error ?? `${status}. ${userId ? copy.account : copy.guest}`}</p>
        <Button onClick={() => void save()} disabled={!dirty || saveState === "saving"}>
          {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {copy.save}
        </Button>
      </div>
    </section>
  );
}
