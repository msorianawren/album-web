"use client";

import { CloudSun, Gauge, Leaf, RotateCcw, Volume2, VolumeX, WandSparkles } from "lucide-react";
import { useDepthEffects, type DepthEffectsMode } from "@/hooks/useDepthEffects";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import { useUIPreferences } from "@/hooks/useUIPreferences";
import { getEnvironmentState } from "@/lib/environment/presets";
import {
  ENVIRONMENT_PRESET_IDS,
  type EnvironmentPreferences,
  type EnvironmentPresetId,
} from "@/lib/environment/preferences";

type NumericPreferenceKey =
  | "windSpeed"
  | "gustStrength"
  | "gustFrequency"
  | "turbulence"
  | "branchSway"
  | "environmentDensity"
  | "particleAmount"
  | "atmosphere"
  | "spatialDepth"
  | "brightness"
  | "birdDensity"
  | "birdSongFrequency"
  | "chimeVolume"
  | "autoChimeFrequency"
  | "precipitationAmount"
  | "wetness"
  | "dropletAmount";

const presetLabels: Record<EnvironmentPresetId, string> = {
  sakura: "Sakura Garden",
  fireflies: "Firefly Grove",
  snow: "Winter Courtyard",
  autumn: "Golden Autumn Canopy",
  mist: "Misty Forest",
  rain: "Rain Garden",
};

type SliderDef = { key: NumericPreferenceKey; label: string; min?: number; max?: number; suffix?: string };

const sceneSliders: SliderDef[] = [
  { key: "brightness", label: "Scene brightness", min: 60, max: 140, suffix: "%" },
  { key: "spatialDepth", label: "Spatial depth" },
  { key: "environmentDensity", label: "Foliage density" },
];

const windSliders: SliderDef[] = [
  { key: "windSpeed", label: "Wind speed" },
  { key: "gustStrength", label: "Gust strength" },
  { key: "gustFrequency", label: "Gust frequency" },
  { key: "turbulence", label: "Wind turbulence" },
  { key: "branchSway", label: "Branch sway" },
];

const weatherSliders: Record<string, SliderDef[]> = {
  rain: [
    { key: "precipitationAmount", label: "Precipitation amount" },
    { key: "atmosphere", label: "Atmosphere" },
    { key: "wetness", label: "Surface wetness" },
    { key: "dropletAmount", label: "Camera droplets" },
  ],
  autumn: [
    { key: "particleAmount", label: "Falling leaves" },
    { key: "atmosphere", label: "Atmosphere" },
  ],
  mist: [
    { key: "atmosphere", label: "Mist density" },
  ],
};

const defaultWeatherSliders: SliderDef[] = [
  { key: "particleAmount", label: "Weather particles" },
  { key: "atmosphere", label: "Fog and atmosphere" },
];

const wildlifeSliders: SliderDef[] = [
  { key: "birdDensity", label: "Bird density" },
  { key: "birdSongFrequency", label: "Bird song frequency" },
  { key: "chimeVolume", label: "Wind-chime volume" },
  { key: "autoChimeFrequency", label: "Automatic chimes" },
];

function normalizeArtistPreset(value: string | undefined): EnvironmentPresetId {
  return ENVIRONMENT_PRESET_IDS.includes(value as EnvironmentPresetId)
    ? value as EnvironmentPresetId
    : "mist";
}

export function EnvironmentControlPanel({
  userId,
  initialPreferences,
  artistPreset,
}: {
  userId?: string | null;
  initialPreferences?: unknown;
  artistPreset?: string;
}) {
  const {
    preferences,
    updatePreference,
    reset,
    reduceDecoration,
    syncState,
  } = useEnvironmentPreferences({ userId, initialPreferences });
  const resolvedPhase = useResolvedEnvironmentPhase(preferences.phase);
  const resolvedPreset = preferences.preset === "default"
    ? normalizeArtistPreset(artistPreset)
    : preferences.preset;
  const state = getEnvironmentState(resolvedPreset, resolvedPhase);
  const { mode: depthMode, setMode: setDepthMode } = useDepthEffects();
  const { soundEnabled, setSoundEnabled } = useUIPreferences();
  const syncLabel = userId
    ? syncState === "saving" ? "Saving..." : syncState === "error" ? "Sync failed" : "Saved to account"
    : "Saved on this device";

  const setNumericPreference = (key: NumericPreferenceKey, value: number) => {
    updatePreference(key, value as EnvironmentPreferences[typeof key]);
  };

  return (
    <section className="environment-control-panel rounded-[1.4rem] border border-border bg-surface/70 p-5 shadow-xl shadow-text-primary/5 backdrop-blur-xl md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-accent">Environmental studio</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold">
            <CloudSun className="h-5 w-5 text-muted-accent" aria-hidden="true" />
            Weather and atmosphere
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            Shape the public gallery atmosphere. Changes appear in the shared scene immediately.
          </p>
        </div>
        <span className={`rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium ${syncState === "error" ? "text-red-600" : "text-text-secondary"}`} role="status">
          {syncLabel}
        </span>
      </div>

      <div
        className="environment-control-preview mt-6"
        style={{
          "--preview-clear": state.clearColor,
          "--preview-fog": state.fogColor,
          "--preview-key": state.keyLight,
          "--preview-fill": state.fillLight,
          "--preview-branch": state.branchColor,
          "--preview-foliage-a": state.foliage[0],
          "--preview-foliage-b": state.foliage[1],
          "--preview-particle": state.particle[0],
          "--preview-brightness": preferences.brightness / 100,
        } as React.CSSProperties}
        aria-label={`Live preview: ${presetLabels[resolvedPreset]}, ${resolvedPhase}`}
      >
        <div className="environment-control-preview__haze" />
        <div className="environment-control-preview__branch environment-control-preview__branch--left" />
        <div className="environment-control-preview__branch environment-control-preview__branch--right" />
        <div className="environment-control-preview__birds" aria-hidden="true"><span /><span /></div>
        <div className="environment-control-preview__caption">
          <span>{presetLabels[resolvedPreset]}</span>
          <strong>{resolvedPhase}</strong>
        </div>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-text-primary">
          Environment preset
          <select
            value={preferences.preset}
            onChange={(event) => updatePreference("preset", event.target.value as EnvironmentPreferences["preset"])}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="default">Artist&apos;s choice</option>
            {ENVIRONMENT_PRESET_IDS.map((preset) => <option key={preset} value={preset}>{presetLabels[preset]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-text-primary">
          Time phase
          <select
            value={preferences.phase}
            onChange={(event) => updatePreference("phase", event.target.value as EnvironmentPreferences["phase"])}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="auto">Auto (local time)</option>
            <option value="day">Day</option>
            <option value="sunset">Sunset</option>
            <option value="night">Night</option>
          </select>
          <span className="text-xs font-normal text-text-secondary">Resolved phase: {resolvedPhase}</span>
        </label>
      </div>

      <div className="mt-7 grid gap-8 md:grid-cols-2">
        <div className="grid gap-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-accent">Scene</h3>
          {sceneSliders.map(({ key, label, min = 0, max = 100, suffix = "%" }) => (
            <label key={key} className="grid gap-2 text-sm text-text-primary">
              <span className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <output className="tabular-nums text-xs text-text-secondary">{preferences[key]}{suffix}</output>
              </span>
              <input type="range" min={min} max={max} step="1" value={preferences[key]} onChange={(e) => setNumericPreference(key, Number(e.target.value))} className="w-full accent-muted-accent" />
            </label>
          ))}
          
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-accent">Wind</h3>
          {windSliders.map(({ key, label, min = 0, max = 100, suffix = "%" }) => (
            <label key={key} className="grid gap-2 text-sm text-text-primary">
              <span className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <output className="tabular-nums text-xs text-text-secondary">{preferences[key]}{suffix}</output>
              </span>
              <input type="range" min={min} max={max} step="1" value={preferences[key]} onChange={(e) => setNumericPreference(key, Number(e.target.value))} className="w-full accent-muted-accent" />
            </label>
          ))}
        </div>

        <div className="grid gap-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-accent">Weather ({presetLabels[resolvedPreset]})</h3>
          {(weatherSliders[resolvedPreset] || defaultWeatherSliders).map(({ key, label, min = 0, max = 100, suffix = "%" }) => (
            <label key={key} className="grid gap-2 text-sm text-text-primary">
              <span className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <output className="tabular-nums text-xs text-text-secondary">{preferences[key]}{suffix}</output>
              </span>
              <input type="range" min={min} max={max} step="1" value={preferences[key]} onChange={(e) => setNumericPreference(key, Number(e.target.value))} className="w-full accent-muted-accent" />
            </label>
          ))}

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-accent">Wildlife & Sound</h3>
          {wildlifeSliders.map(({ key, label, min = 0, max = 100, suffix = "%" }) => (
            <label key={key} className="grid gap-2 text-sm text-text-primary">
              <span className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <output className="tabular-nums text-xs text-text-secondary">{preferences[key]}{suffix}</output>
              </span>
              <input type="range" min={min} max={max} step="1" value={preferences[key]} onChange={(e) => setNumericPreference(key, Number(e.target.value))} className="w-full accent-muted-accent" />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-text-primary">
          <span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-accent" aria-hidden="true" /> Depth-effects quality</span>
          <select
            value={depthMode}
            onChange={(event) => setDepthMode(event.target.value as DepthEffectsMode)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="auto">Auto</option>
            <option value="full">Full</option>
            <option value="reduced">Reduced</option>
            <option value="off">Off (static atmosphere)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex min-h-11 items-center justify-between gap-3 self-end rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={!soundEnabled}
        >
          <span className="inline-flex items-center gap-2">
            {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            Master environmental sound
          </span>
          <span className="text-xs uppercase text-text-secondary">{soundEnabled ? "On" : "Muted"}</span>
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset to Artist Defaults
        </button>
        <button type="button" onClick={reduceDecoration} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Leaf className="h-4 w-4" aria-hidden="true" /> Reduced Decoration
        </button>
        <span className="inline-flex items-center gap-2 px-2 text-xs text-text-secondary"><WandSparkles className="h-4 w-4" aria-hidden="true" /> 18 curated scene states</span>
      </div>
    </section>
  );
}
