"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import type { SiteSettings, LandingPageContent } from "@/lib/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-border bg-background/55 p-4">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
}

export default function PerformanceSettingsTab({
  settings,
  landing,
  updateSettings,
  updateAdvanced,
  updateLanding,
}: {
  settings: SiteSettings;
  landing: LandingPageContent;
  updateSettings: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
  updateAdvanced: (key: string, value: unknown) => void;
  updateLanding: <K extends keyof LandingPageContent>(key: K, value: LandingPageContent[K]) => void;
}) {
  return (
    <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="mb-2 font-serif text-2xl font-medium text-text-primary">Performance & Scaling</h2>
        <p className="text-sm leading-6 text-text-secondary">
          Tune resource consumption, background tasks, and animation limits.
        </p>
      </div>

      <div className="grid gap-5 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h3 className="font-serif text-xl text-text-primary">Background Effects & JS</h3>
        <p className="text-sm text-text-secondary">Background animations can drain battery on mobile devices. Adjust these limits safely.</p>
        
        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <Toggle 
            label="Reduce Animations on Mobile" 
            checked={landing.background_settings.reduce_animations_on_mobile ?? false} 
            onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, reduce_animations_on_mobile: val })} 
          />
          <Toggle 
            label="Disable Effects Completely" 
            checked={!landing.background_settings.enabled} 
            onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, enabled: !val })} 
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <NumberField 
            label="Global Particle Density (10-100)" 
            value={landing.background_settings.density ?? 50} 
            min={10} max={100} 
            onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, density: val })} 
          />
          <NumberField 
            label="Animation Update Frequency" 
            value={settings.advanced_settings?.perf_animation_fps ?? 60} 
            min={15} max={120} 
            onChange={(val) => updateAdvanced("perf_animation_fps", val)} 
          />
        </div>
      </div>

      <div className="grid gap-5 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h3 className="font-serif text-xl text-text-primary">Media & Uploads</h3>
        <p className="text-sm text-text-secondary">Control browser memory and network usage during batch media uploads.</p>
        
        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <NumberField 
            label="Concurrent R2 Uploads (1-10)" 
            value={settings.advanced_settings?.perf_upload_concurrency ?? 2} 
            min={1} max={10} 
            onChange={(val) => updateAdvanced("perf_upload_concurrency", val)} 
          />
          <NumberField 
            label="Max Upload Files Per Batch" 
            value={settings.max_upload_files_per_batch ?? 50} 
            min={1} max={500} 
            onChange={(val) => updateSettings("max_upload_files_per_batch", val)} 
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <Toggle 
            label="Use Thumbnails in Admin Grid" 
            checked={settings.use_thumbnails_in_grid ?? true} 
            onChange={(val) => updateSettings("use_thumbnails_in_grid", val)} 
          />
        </div>
      </div>

      <div className="grid gap-5 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <h3 className="font-serif text-xl text-text-primary">Studio Memory Management</h3>
        <p className="text-sm text-text-secondary">Clean up obsolete client-side caches and local storage.</p>
        
        <div className="flex">
          <button 
            type="button"
            onClick={() => {
              localStorage.removeItem("album-theme");
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith("album_view_")) {
                  localStorage.removeItem(key);
                }
              });
              alert("Local memory cleared.");
            }}
            className="rounded-full bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/20"
          >
            Clear Browser Memory
          </button>
        </div>
      </div>
    </div>
  );
}
