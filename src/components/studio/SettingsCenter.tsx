"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, HardDrive, ImageUp, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { AlbumStatus, LandingPageContent, SiteSettings, AboutProfile } from "@/lib/types";
import { AboutSettingsTab } from "@/components/studio/settings/AboutSettingsTab";
import { LOCALES } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

type TabKey =
  | "general"
  | "landing"
  | "about"
  | "appearance"
  | "albums"
  | "media"
  | "comments"
  | "seo"
  | "security"
  | "storage"
  | "performance"
  | "danger";

interface MaskedValue {
  present: boolean;
  value: string | null;
}

interface SystemHealthSummary {
  siteUrl: string | null;
  supabaseUrl: string | null;
  r2Bucket: MaskedValue;
  r2PublicUrl: string | null;
  env: Record<string, boolean>;
  tableChecks: Array<{ table: string; ok: boolean }>;
  counts: Record<string, number>;
  currentAdmin: { isAdmin: boolean; userId: MaskedValue; email: string | null } | null;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "landing", label: "Landing" },
  { key: "about", label: "About Profile" },
  { key: "appearance", label: "Appearance" },
  { key: "albums", label: "Albums" },
  { key: "media", label: "Media" },
  { key: "comments", label: "Comments" },
  { key: "seo", label: "SEO" },
  { key: "security", label: "Security" },
  { key: "storage", label: "Storage" },
  { key: "performance", label: "Performance" },
  { key: "danger", label: "Danger" },
];

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

export function SettingsCenter({
  initialSettings,
  initialLanding,
  initialAboutProfile,
  systemHealth,
}: {
  initialSettings: SiteSettings;
  initialLanding: LandingPageContent;
  initialAboutProfile: AboutProfile;
  systemHealth: SystemHealthSummary;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [landing, setLanding] = useState(initialLanding);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [activeLandingLocale, setActiveLandingLocale] = useState<string>("en");
  const [saving, setSaving] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingMessage, setLandingMessage] = useState("");
  const [message, setMessage] = useState("");
  const [r2Result, setR2Result] = useState("");
  const [dangerResult, setDangerResult] = useState("");

  const envRows = useMemo(() => Object.entries(systemHealth.env), [systemHealth.env]);

  // Dirty state detection
  const isSettingsDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(initialSettings), [settings, initialSettings]);
  const isLandingDirty = useMemo(() => JSON.stringify(landing) !== JSON.stringify(initialLanding), [landing, initialLanding]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateAdvanced(key: string, value: any) {
    setSettings((current) => ({
      ...current,
      advanced_settings: {
        ...(current.advanced_settings || {}),
        [key]: value
      }
    }));
  }

  function updateLanding<K extends keyof LandingPageContent>(key: K, value: LandingPageContent[K]) {
    setLanding((current) => ({ ...current, [key]: value }));
  }

  function getLandingLocalized<K extends keyof LandingPageContent>(key: K): string {
    if (activeLandingLocale === "en") return (landing[key] as string) || "";
    return landing.translations?.[activeLandingLocale]?.[key] ?? "";
  }

  function updateLandingLocalized<K extends keyof LandingPageContent>(key: K, value: string) {
    if (activeLandingLocale === "en") {
      updateLanding(key, value as any);
    } else {
      const trans = { ...(landing.translations || {}) };
      if (!trans[activeLandingLocale]) trans[activeLandingLocale] = {};
      trans[activeLandingLocale][key] = value;
      updateLanding("translations", trans);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("Saving settings...");
    const response = await fetch("/api/studio/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const payload = await response.json();
    setSaving(false);
    if (!payload.success) {
      setMessage(payload.message ?? "Save failed.");
      return;
    }
    setSettings(payload.data.settings);
    setMessage("Settings saved.");
  }

  async function uploadSettingsAsset(type: "logo" | "favicon", file: File | null) {
    if (!file) return;
    setMessage(`Requesting upload URL for ${type}...`);
    
    try {
      const presignRes = await fetch("/api/studio/settings/upload-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          type,
        }),
      });

      const presignPayload = await presignRes.json();
      if (!presignPayload.success) {
        setMessage(presignPayload.message ?? `Failed to request upload URL for ${type}.`);
        return;
      }

      const { uploadUrl, publicUrl } = presignPayload.data;

      setMessage(`Uploading ${type} to storage...`);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage server returned status ${xhr.status}.`));
          }
        };
        xhr.onerror = () => reject(new Error("Storage upload network error."));
        xhr.send(file);
      });

      setMessage(`${type} uploaded. You must save to apply changes.`);
      if (type === "logo") update("site_logo_url", publicUrl);
      if (type === "favicon") update("site_favicon_url", publicUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `${type} upload failed.`);
    }
  }

  async function uploadAboutAsset(type: "about-profile" | "about-cover", file: File): Promise<string> {
    setMessage(`Requesting upload URL for ${type}...`);
    
    const presignRes = await fetch("/api/studio/settings/upload-presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        type,
      }),
    });

    const presignPayload = await presignRes.json();
    if (!presignPayload.success) {
      throw new Error(presignPayload.message ?? `Failed to request upload URL for ${type}.`);
    }

    const { uploadUrl, publicUrl } = presignPayload.data;

    setMessage(`Uploading ${type} to storage...`);
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage server returned status ${xhr.status}.`));
        }
      };
      xhr.onerror = () => reject(new Error("Storage upload network error."));
      xhr.send(file);
    });

    setMessage(`${type} uploaded.`);
    return publicUrl;
  }

  async function saveLanding() {
    setSavingLanding(true);
    setLandingMessage("Saving landing page...");
    const response = await fetch("/api/landing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(landing),
    });
    const payload = await response.json();
    setSavingLanding(false);
    if (!payload.success) {
      setLandingMessage(payload.message ?? "Landing save failed.");
      return;
    }
    setLanding(payload.data.landing);
    setLandingMessage("Landing page saved.");
  }

  async function uploadLandingAsset(field: "hero_image_url" | "portrait_image_url" | "gallery_image_url" | "custom_background" | "media" | "portrait", file: File | null): Promise<string | void> {
    if (!file) return;
    setLandingMessage("Requesting upload URL...");
    
    try {
      const slot = field.replace("_image_url", "");
      
      // 1. Request presigned URL
      const presignRes = await fetch("/api/landing/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });

      const presignPayload = await presignRes.json();
      if (!presignPayload.success) {
        setLandingMessage(presignPayload.message ?? "Failed to request upload URL.");
        return;
      }

      const { uploadUrl, r2Key } = presignPayload.data;

      // 2. PUT file directly to storage
      setLandingMessage("Uploading image to storage...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage server returned status ${xhr.status}.`));
          }
        };
        xhr.onerror = () => reject(new Error("Storage upload network error."));
        xhr.send(file);
      });

      // 3. Complete processing and optimization
      setLandingMessage("Optimizing and processing image...");
      const completeRes = await fetch("/api/landing/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          r2Key,
        }),
      });

      const completePayload = await completeRes.json();
      if (!completePayload.success) {
        setLandingMessage(completePayload.message ?? "Failed to finalize image upload.");
        return;
      }

      const finalUrl = completePayload.data.asset.previewUrl;

      // 4. Auto-save the landing content with the new image URL (only for top-level fields)
      if (field === "hero_image_url" || field === "portrait_image_url" || field === "gallery_image_url") {
        const nextLanding = { ...landing, [field]: finalUrl };
        setLanding(nextLanding);

        setLandingMessage("Saving landing page settings...");
        const saveResponse = await fetch("/api/landing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextLanding),
        });

        const savePayload = await saveResponse.json();
        if (!savePayload.success) {
          setLandingMessage(savePayload.message ?? "Image uploaded but auto-save failed.");
          return finalUrl;
        }

        setLanding(savePayload.data.landing);
        setLandingMessage("Image uploaded and landing settings auto-saved.");
        router.refresh();
      } else {
        setLandingMessage("Asset uploaded. Save landing page to apply changes.");
      }

      return finalUrl;
    } catch (err) {
      setLandingMessage(err instanceof Error ? err.message : "Image upload failed.");
    }
  }

  async function checkR2() {
    setR2Result("Checking R2...");
    const response = await fetch("/api/studio/r2-health-check", { method: "POST" });
    const payload = await response.json();
    setR2Result(payload.success ? payload.data.message : payload.message ?? "R2 check failed.");
  }

  async function recalculateCounts() {
    const typed = window.prompt('Type "recalculate" to refresh album counters.');
    if (typed !== "recalculate") return;
    setDangerResult("Recalculating counts...");
    const response = await fetch("/api/studio/recalculate-counts", { method: "POST" });
    const payload = await response.json();
    setDangerResult(payload.success ? `Updated ${payload.data.updated} album(s).` : payload.message ?? "Recalculate failed.");
  }

  function clearUiState() {
    localStorage.removeItem("album-theme");
    setDangerResult("Local UI state cleared in this browser.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-xl shadow-text-primary/5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  activeTab === tab.key
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-background text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "general" ? (
        <Panel title="General" description="Runtime identity and visitor-facing maintenance controls.">
          <Field label="Site name">
            <Input value={settings.site_name} onChange={(event) => update("site_name", event.target.value)} />
          </Field>
          <Field label="Site description">
            <Textarea value={settings.site_description} onChange={(event) => update("site_description", event.target.value)} maxLength={500} />
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageField
              label="Website Logo URL"
              value={settings.site_logo_url ?? ""}
              onValue={(value) => update("site_logo_url", value)}
              onUpload={(file) => uploadSettingsAsset("logo", file)}
            />
            <ImageField
              label="Favicon URL (Optional)"
              value={settings.site_favicon_url ?? ""}
              onValue={(value) => update("site_favicon_url", value)}
              onUpload={(file) => uploadSettingsAsset("favicon", file)}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Logo alt text">
              <Input value={settings.site_logo_alt ?? ""} onChange={(event) => update("site_logo_alt", event.target.value)} />
            </Field>
            <Field label="Contact email">
              <Input value={settings.contact_email ?? ""} onChange={(event) => update("contact_email", event.target.value)} type="email" />
            </Field>
          </div>
          <ReadOnly label="Public site URL" value={systemHealth.siteUrl ?? "Environment not configured"} />
          <Toggle label="Maintenance mode" checked={settings.maintenance_mode} onChange={(value) => update("maintenance_mode", value)} />
          <Field label="Maintenance message">
            <Textarea value={settings.maintenance_message ?? ""} onChange={(event) => update("maintenance_message", event.target.value)} maxLength={500} />
          </Field>
        </Panel>
      ) : null}

      {activeTab === "landing" ? (
        <Panel title="Landing Page" description="Edit the public first impression: copy, calls to action, stats, and homepage imagery.">
          <div className="mb-4">
            <span className="text-sm font-medium text-text-primary mr-3">Editing language:</span>
            <select
              value={activeLandingLocale}
              onChange={(e) => setActiveLandingLocale(e.target.value)}
              className="h-9 rounded-[0.8rem] border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="en">English (Default)</option>
              {Object.entries(LOCALES)
                .filter(([code]) => code !== "en")
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Eyebrow">
                  <Input value={getLandingLocalized("eyebrow")} onChange={(event) => updateLandingLocalized("eyebrow", event.target.value)} maxLength={80} />
                </Field>
                <Field label="Headline">
                  <Input value={getLandingLocalized("headline")} onChange={(event) => updateLandingLocalized("headline", event.target.value)} maxLength={140} />
                </Field>
              </div>
              <Field label="Subheadline">
                <Input value={getLandingLocalized("subheadline")} onChange={(event) => updateLandingLocalized("subheadline", event.target.value)} maxLength={220} />
              </Field>
              <Field label="Body">
                <Textarea value={getLandingLocalized("body")} onChange={(event) => updateLandingLocalized("body", event.target.value)} maxLength={500} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Primary CTA label">
                  <Input value={getLandingLocalized("primary_cta_label")} onChange={(event) => updateLandingLocalized("primary_cta_label", event.target.value)} maxLength={40} />
                </Field>
                <Field label="Primary CTA link (Links are not translated)">
                  <Input value={landing.primary_cta_href} onChange={(event) => updateLanding("primary_cta_href", event.target.value)} placeholder="#albums" />
                </Field>
                <Field label="Secondary CTA label">
                  <Input value={getLandingLocalized("secondary_cta_label")} onChange={(event) => updateLandingLocalized("secondary_cta_label", event.target.value)} maxLength={40} />
                </Field>
                <Field label="Secondary CTA link (Links are not translated)">
                  <Input value={landing.secondary_cta_href} onChange={(event) => updateLanding("secondary_cta_href", event.target.value)} placeholder="/about" />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <ImageField label="Hero image" value={landing.hero_image_url} onValue={(value) => updateLanding("hero_image_url", value)} onUpload={(file) => uploadLandingAsset("hero_image_url", file)} />
                <ImageField label="Portrait image" value={landing.portrait_image_url} onValue={(value) => updateLanding("portrait_image_url", value)} onUpload={(file) => uploadLandingAsset("portrait_image_url", file)} />
                <ImageField label="Gallery image" value={landing.gallery_image_url} onValue={(value) => updateLanding("gallery_image_url", value)} onUpload={(file) => uploadLandingAsset("gallery_image_url", file)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Feature title">
                  <Input value={getLandingLocalized("feature_title")} onChange={(event) => updateLandingLocalized("feature_title", event.target.value)} maxLength={140} />
                </Field>
                <Field label="Feature body">
                  <Textarea value={getLandingLocalized("feature_body")} onChange={(event) => updateLandingLocalized("feature_body", event.target.value)} maxLength={420} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <StatFields label="Stat 1" value={getLandingLocalized("stat_one_value")} caption={getLandingLocalized("stat_one_label")} onValue={(value) => updateLandingLocalized("stat_one_value", value)} onCaption={(value) => updateLandingLocalized("stat_one_label", value)} />
                <StatFields label="Stat 2" value={getLandingLocalized("stat_two_value")} caption={getLandingLocalized("stat_two_label")} onValue={(value) => updateLandingLocalized("stat_two_value", value)} onCaption={(value) => updateLandingLocalized("stat_two_label", value)} />
                <StatFields label="Stat 3" value={getLandingLocalized("stat_three_value")} caption={getLandingLocalized("stat_three_label")} onValue={(value) => updateLandingLocalized("stat_three_value", value)} onCaption={(value) => updateLandingLocalized("stat_three_label", value)} />
              </div>
              <div className="mt-8 border-t border-border pt-8">
                <h3 className="mb-4 font-serif text-xl text-text-primary">Nature Animated Background</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Toggle label="Enable Background" checked={landing.background_settings.enabled} onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, enabled: val })} />
                  <Toggle label="Apply to All Public Pages" checked={landing.background_settings.apply_to_all_public_pages ?? true} onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, apply_to_all_public_pages: val })} />
                  <Select 
                    label="Preset Theme" 
                    value={landing.background_settings.preset} 
                    onChange={(val) => updateLanding("background_settings", { ...landing.background_settings, preset: val as any })} 
                    options={["sakura", "fireflies", "snow", "autumn", "mist", "rain"]} 
                  />
                  <Field label="Opacity (0-100)">
                    <Input type="number" min={0} max={100} value={landing.background_settings.opacity ?? 100} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, opacity: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Intensity (0-100)">
                    <Input type="number" min={0} max={100} value={landing.background_settings.intensity ?? 100} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, intensity: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Speed (0-100)">
                    <Input type="number" min={0} max={100} value={landing.background_settings.speed ?? 50} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, speed: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Density (0-100)">
                    <Input type="number" min={0} max={100} value={landing.background_settings.density ?? 50} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, density: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Blur / Softness (0-100)">
                    <Input type="number" min={0} max={100} value={landing.background_settings.blur ?? 0} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, blur: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Accent Color 1 (Hex)">
                    <Input placeholder="#ff0000" value={landing.background_settings.accent_color_1 ?? ""} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, accent_color_1: e.target.value })} />
                  </Field>
                  <Field label="Accent Color 2 (Hex)">
                    <Input placeholder="#0000ff" value={landing.background_settings.accent_color_2 ?? ""} onChange={(e) => updateLanding("background_settings", { ...landing.background_settings, accent_color_2: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-4">
                  <ImageField label="Custom Background URL (Image or Video)" value={landing.background_settings.custom_url ?? ""} onValue={(value) => updateLanding("background_settings", { ...landing.background_settings, custom_url: value })} onUpload={async (file) => {
                    const url = await uploadLandingAsset("custom_background", file);
                    if (url) updateLanding("background_settings", { ...landing.background_settings, custom_url: url });
                  }} />
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <h3 className="mb-4 font-serif text-xl text-text-primary">Social Links</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {landing.social_links.map((link, idx) => (
                    <div key={link.id} className="rounded-[1rem] border border-border bg-background/55 p-4">
                      <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                        <span className="font-medium text-sm text-text-primary">{link.platform}</span>
                        <input type="checkbox" checked={link.enabled} onChange={(e) => {
                            const updated = [...landing.social_links];
                            updated[idx].enabled = e.target.checked;
                            updateLanding("social_links", updated);
                        }} className="h-4 w-4 accent-[var(--accent)]" />
                      </div>
                      <Field label="URL">
                        <Input 
                          value={link.url} 
                          onChange={(e) => {
                            const updated = [...landing.social_links];
                            updated[idx].url = e.target.value;
                            updateLanding("social_links", updated);
                          }} 
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl text-text-primary">Media Gallery</h3>
                  <Button onClick={() => updateLanding("media_items", [...landing.media_items, { id: Math.random().toString(36).slice(2), type: "image", url: "", enabled: true, order: landing.media_items.length + 1, title: "", caption: "", alt: "", poster_url: "" }])}>Add Media</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {landing.media_items.map((item, idx) => (
                    <div key={item.id} className="rounded-[1rem] border border-border bg-background/55 p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-medium text-sm text-text-primary">Item {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={item.enabled} onChange={(e) => {
                              const updated = [...landing.media_items];
                              updated[idx].enabled = e.target.checked;
                              updateLanding("media_items", updated);
                          }} className="h-4 w-4 accent-[var(--accent)]" />
                          <button onClick={() => updateLanding("media_items", landing.media_items.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs uppercase">Remove</button>
                        </div>
                      </div>
                      <Select label="Type" value={item.type} onChange={(v) => {
                        const updated = [...landing.media_items];
                        updated[idx].type = v as "image" | "video";
                        updateLanding("media_items", updated);
                      }} options={["image", "video"]} />
                      <ImageField label="Media URL" value={item.url} onValue={(v) => {
                        const updated = [...landing.media_items];
                        updated[idx].url = v;
                        updateLanding("media_items", updated);
                      }} onUpload={async (f) => {
                        const url = await uploadLandingAsset("media", f);
                        if (url) {
                          const updated = [...landing.media_items];
                          updated[idx].url = url;
                          updateLanding("media_items", updated);
                        }
                      }} />
                      <Field label="Title"><Input value={item.title ?? ""} onChange={(e) => {
                        const updated = [...landing.media_items];
                        updated[idx].title = e.target.value;
                        updateLanding("media_items", updated);
                      }} /></Field>
                      <Field label="Caption"><Textarea value={item.caption ?? ""} onChange={(e) => {
                        const updated = [...landing.media_items];
                        updated[idx].caption = e.target.value;
                        updateLanding("media_items", updated);
                      }} /></Field>
                      <Field label="Order"><Input type="number" value={item.order} onChange={(e) => {
                        const updated = [...landing.media_items];
                        updated[idx].order = parseInt(e.target.value) || 0;
                        updateLanding("media_items", updated);
                      }} /></Field>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl text-text-primary">Creative Partners</h3>
                  <Button onClick={() => updateLanding("collaborators", [...landing.collaborators, { id: Math.random().toString(36).slice(2), name: "", role: "", enabled: true, order: landing.collaborators.length + 1, bio: "", portfolio_url: "", portrait_url: "" }])}>Add Partner</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {landing.collaborators.map((collab, idx) => (
                    <div key={collab.id} className="rounded-[1rem] border border-border bg-background/55 p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <Input className="h-8 text-sm" placeholder="Name" value={collab.name} onChange={(e) => {
                          const updated = [...landing.collaborators];
                          updated[idx].name = e.target.value;
                          updateLanding("collaborators", updated);
                        }} />
                        <div className="flex items-center gap-2 ml-4">
                          <input type="checkbox" checked={collab.enabled} onChange={(e) => {
                              const updated = [...landing.collaborators];
                              updated[idx].enabled = e.target.checked;
                              updateLanding("collaborators", updated);
                          }} className="h-4 w-4 accent-[var(--accent)] shrink-0" />
                          <button onClick={() => updateLanding("collaborators", landing.collaborators.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-600 text-xs uppercase shrink-0">Remove</button>
                        </div>
                      </div>
                      <Field label="Role"><Input value={collab.role} onChange={(e) => {
                        const updated = [...landing.collaborators];
                        updated[idx].role = e.target.value;
                        updateLanding("collaborators", updated);
                      }} /></Field>
                      <ImageField label="Portrait URL" value={collab.portrait_url ?? ""} onValue={(v) => {
                        const updated = [...landing.collaborators];
                        updated[idx].portrait_url = v;
                        updateLanding("collaborators", updated);
                      }} onUpload={async (f) => {
                        const url = await uploadLandingAsset("portrait", f);
                        if (url) {
                          const updated = [...landing.collaborators];
                          updated[idx].portrait_url = url;
                          updateLanding("collaborators", updated);
                        }
                      }} />
                      <Field label="Portfolio URL"><Input value={collab.portfolio_url ?? ""} onChange={(e) => {
                        const updated = [...landing.collaborators];
                        updated[idx].portfolio_url = e.target.value;
                        updateLanding("collaborators", updated);
                      }} /></Field>
                      <Field label="Bio"><Textarea value={collab.bio ?? ""} onChange={(e) => {
                        const updated = [...landing.collaborators];
                        updated[idx].bio = e.target.value;
                        updateLanding("collaborators", updated);
                      }} /></Field>
                      <Field label="Order"><Input type="number" value={collab.order} onChange={(e) => {
                        const updated = [...landing.collaborators];
                        updated[idx].order = parseInt(e.target.value) || 0;
                        updateLanding("collaborators", updated);
                      }} /></Field>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <h3 className="mb-4 font-serif text-xl text-text-primary">Section Visibility</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Toggle label="Editorial Intro" checked={landing.section_toggles?.editorial_intro !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, editorial_intro: v })} />
                  <Toggle label="Album Worlds" checked={landing.section_toggles?.album_worlds !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, album_worlds: v })} />
                  <Toggle label="Media Gallery" checked={landing.section_toggles?.media_gallery !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, media_gallery: v })} />
                  <Toggle label="Social Links Tree" checked={landing.section_toggles?.social_tree !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, social_tree: v })} />
                  <Toggle label="Private Experience" checked={landing.section_toggles?.private_experience !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, private_experience: v })} />
                  <Toggle label="Creative Services" checked={landing.section_toggles?.creative_services !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, creative_services: v })} />
                  <Toggle label="Collaborators" checked={landing.section_toggles?.collaborators !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, collaborators: v })} />
                  <Toggle label="Personal Letter" checked={landing.section_toggles?.personal_letter !== false} onChange={(v) => updateLanding("section_toggles", { ...landing.section_toggles, personal_letter: v })} />
                </div>
              </div>
            </div>
            <LandingPreview landing={landing} activeLandingLocale={activeLandingLocale} />
          </div>
        </Panel>
      ) : null}

      {activeTab === "about" ? (
        <AboutSettingsTab
          initialProfile={initialAboutProfile}
          uploadAsset={uploadAboutAsset}
          onUpdate={async (profile) => {
            const res = await fetch("/api/studio/about", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(profile),
            });
            const payload = await res.json();
            if (!payload.success) {
              throw new Error(payload.message ?? "Failed to save about profile.");
            }
            setMessage("About profile saved successfully.");
            router.refresh();
          }}
        />
      ) : null}

      {activeTab === "appearance" ? (
        <Panel title="Appearance" description="Default presentation choices for the public album experience.">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Default theme" value={settings.default_theme} onChange={(value) => update("default_theme", value as SiteSettings["default_theme"])} options={["dark", "light", "system"]} />
            <Select label="Homepage layout" value={settings.homepage_layout} onChange={(value) => update("homepage_layout", value as SiteSettings["homepage_layout"])} options={["featured", "grid", "minimal"]} />
            <Select label="Album card density" value={settings.album_card_density} onChange={(value) => update("album_card_density", value as SiteSettings["album_card_density"])} options={["comfortable", "compact"]} />
            
            <Select label="Homepage Hero Preset" value={settings.homepage_hero_preset} onChange={(value) => update("homepage_hero_preset", value)} options={["cinematic", "editorial", "minimal", "split"]} />
            <Select label="Social Tree Style" value={settings.social_tree_style} onChange={(value) => update("social_tree_style", value)} options={["botanical", "clean", "grid"]} />
            <Select label="Collaborator Mode" value={settings.collaborator_mode} onChange={(value) => update("collaborator_mode", value)} options={["portraits", "list", "cards"]} />
            <Select label="Homepage Gallery Mode" value={settings.homepage_gallery_mode} onChange={(value) => update("homepage_gallery_mode", value)} options={["editorial_grid", "masonry", "carousel"]} />
            <Select label="Album List Layout" value={settings.album_list_layout} onChange={(value) => update("album_list_layout", value)} options={["editorial", "grid", "list"]} />
            <Select label="Album Viewer Style" value={settings.album_viewer_style} onChange={(value) => update("album_viewer_style", value)} options={["clean", "cinematic", "immersive"]} />
          </div>
          <div className="mt-4 grid gap-4 border-t border-border pt-4">
            <Toggle label="Show counts on cards" checked={settings.show_counts_on_cards} onChange={(value) => update("show_counts_on_cards", value)} />
            <Toggle label="Show updated date" checked={settings.show_updated_date} onChange={(value) => update("show_updated_date", value)} />
            <Toggle label="Show status badges" checked={settings.show_status_badges} onChange={(value) => update("show_status_badges", value)} />
          </div>
          <div className="mt-4 grid gap-4 border-t border-border pt-4">
            <h3 className="font-serif text-xl text-text-primary">Visitor Experience</h3>
            <Toggle label="Enable Album Memory (Remember where visitors left off)" checked={settings.advanced_settings?.enable_album_memory ?? false} onChange={(value) => updateAdvanced("enable_album_memory", value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <Toggle label="Show 'Recently viewed' badge" checked={settings.advanced_settings?.show_recently_viewed_badge ?? false} onChange={(value) => updateAdvanced("show_recently_viewed_badge", value)} />
              <Toggle label="Show 'Viewed' badge" checked={settings.advanced_settings?.show_already_viewed_badge ?? false} onChange={(value) => updateAdvanced("show_already_viewed_badge", value)} />
              <Toggle label="Show 'Continue viewing' hint inside albums" checked={settings.advanced_settings?.show_continue_viewing_hint ?? false} onChange={(value) => updateAdvanced("show_continue_viewing_hint", value)} />
              <NumberField label="Memory retention (days)" value={settings.advanced_settings?.album_memory_retention_days ?? 180} min={1} max={365} onChange={(value) => updateAdvanced("album_memory_retention_days", value)} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 border-t border-border pt-4">
            <Field label="Footer description">
              <Textarea value={settings.footer_description ?? ""} onChange={(event) => update("footer_description", event.target.value)} maxLength={500} />
            </Field>
            <Field label="Footer note">
              <Textarea value={settings.footer_note ?? ""} onChange={(event) => update("footer_note", event.target.value)} maxLength={300} />
            </Field>
          </div>
        </Panel>
      ) : null}

      {activeTab === "albums" ? (
        <Panel title="Album Defaults" description="Defaults and policy knobs used when creating or rendering albums.">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Default status" value={settings.default_album_status} onChange={(value) => update("default_album_status", value as AlbumStatus)} options={["public", "updating", "private"]} />
            <Select label="Default sort order" value={settings.default_sort_order} onChange={(value) => update("default_sort_order", value as SiteSettings["default_sort_order"])} options={["newest", "oldest", "title"]} />
            <NumberField label="Albums per page" value={settings.albums_per_page} min={6} max={100} onChange={(value) => update("albums_per_page", value)} />
          </div>
          <Toggle label="Default comments enabled" checked={settings.allow_public_comments} onChange={(value) => update("allow_public_comments", value)} />
          <Toggle label="Default likes enabled" checked={settings.allow_public_likes} onChange={(value) => update("allow_public_likes", value)} />
          <Toggle label="Default downloads enabled" checked={settings.allow_public_downloads} onChange={(value) => update("allow_public_downloads", value)} />
        </Panel>
      ) : null}

      {activeTab === "media" ? (
        <Panel title="Media And Uploads" description="Upload constraints and grid rendering preferences. Server-side validation remains mandatory.">
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="Max image size MB" value={settings.max_image_size_mb} min={1} max={100} onChange={(value) => update("max_image_size_mb", value)} />
            <NumberField label="Max video size MB" value={settings.max_video_size_mb} min={10} max={2000} onChange={(value) => update("max_video_size_mb", value)} />
            <NumberField label="Media per page" value={settings.media_per_page} min={12} max={200} onChange={(value) => update("media_per_page", value)} />
            <NumberField label="Max files per upload" value={settings.max_upload_files_per_batch} min={1} max={100} onChange={(value) => update("max_upload_files_per_batch", value)} />
            <NumberField label="Max album storage MB" value={settings.max_album_storage_mb} min={100} max={100000} onChange={(value) => update("max_album_storage_mb", value)} />
            <NumberField label="Max image pixels" value={settings.max_image_pixels} min={1000000} max={100000000} onChange={(value) => update("max_image_pixels", value)} />
          </div>
          <Toggle label="Enable image uploads" checked={settings.enable_image_uploads} onChange={(value) => update("enable_image_uploads", value)} />
          <Toggle label="Enable video uploads" checked={settings.enable_video_uploads} onChange={(value) => update("enable_video_uploads", value)} />
          <Toggle label="Strip image metadata before publishing" checked={settings.strip_image_metadata} onChange={(value) => update("strip_image_metadata", value)} />
          <Toggle label="Store private raw originals when possible" checked={settings.store_private_originals} onChange={(value) => update("store_private_originals", value)} />
          <Toggle label="Auto-set first uploaded image as cover" checked={settings.auto_set_first_image_as_cover} onChange={(value) => update("auto_set_first_image_as_cover", value)} />
          <Toggle label="Show video posters" checked={settings.show_video_posters} onChange={(value) => update("show_video_posters", value)} />
          <Toggle label="Use thumbnails in grid" checked={settings.use_thumbnails_in_grid} onChange={(value) => update("use_thumbnails_in_grid", value)} />
          <Toggle label="Enable watermark on public image variants" checked={settings.enable_media_watermark} onChange={(value) => update("enable_media_watermark", value)} />
          <Field label="Watermark text">
            <Input value={settings.watermark_text ?? ""} onChange={(event) => update("watermark_text", event.target.value)} maxLength={80} />
          </Field>
          <ReadOnly label="Allowed image types" value={imageTypes.join(", ")} />
          <ReadOnly label="Allowed video types" value={videoTypes.join(", ")} />
          <ReadOnly label="Video processing policy" value="Videos are signature-validated and marked for review; full metadata stripping requires a media worker." />
        </Panel>
      ) : null}

      {activeTab === "comments" ? (
        <Panel title="Comments And Likes" description="Public interaction settings and moderation limits.">
          <Toggle label="Enable public comments" checked={settings.allow_public_comments} onChange={(value) => update("allow_public_comments", value)} />
          <Toggle label="Require comment name" checked={settings.require_comment_name} onChange={(value) => update("require_comment_name", value)} />
          <NumberField label="Max comment length" value={settings.max_comment_length} min={100} max={2000} onChange={(value) => update("max_comment_length", value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Comments per window" value={settings.comment_rate_limit_count} min={1} max={200} onChange={(value) => update("comment_rate_limit_count", value)} />
            <NumberField label="Comment window seconds" value={settings.comment_rate_limit_window_seconds} min={10} max={86400} onChange={(value) => update("comment_rate_limit_window_seconds", value)} />
          </div>
          <Toggle label="Block duplicate recent comments" checked={settings.block_duplicate_comments} onChange={(value) => update("block_duplicate_comments", value)} />
          <Toggle label="Moderate comments containing links" checked={settings.block_comment_links} onChange={(value) => update("block_comment_links", value)} />
          <Toggle label="Send suspicious comments to review" checked={settings.moderate_suspicious_comments} onChange={(value) => update("moderate_suspicious_comments", value)} />
          <Toggle label="Enable likes" checked={settings.enable_likes} onChange={(value) => update("enable_likes", value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Likes per window" value={settings.like_rate_limit_count} min={1} max={1000} onChange={(value) => update("like_rate_limit_count", value)} />
            <NumberField label="Like window seconds" value={settings.like_rate_limit_window_seconds} min={10} max={86400} onChange={(value) => update("like_rate_limit_window_seconds", value)} />
          </div>
        </Panel>
      ) : null}

      {activeTab === "seo" ? (
        <Panel title="SEO And Sharing" description="Metadata defaults for public pages and shared album previews.">
          <Field label="SEO title">
            <Input value={settings.seo_title ?? ""} onChange={(event) => update("seo_title", event.target.value)} maxLength={120} />
          </Field>
          <Field label="SEO description">
            <Textarea value={settings.seo_description ?? ""} onChange={(event) => update("seo_description", event.target.value)} maxLength={300} />
          </Field>
          <Field label="OG image URL">
            <Input value={settings.og_image_url ?? ""} onChange={(event) => update("og_image_url", event.target.value)} placeholder="https://..." />
          </Field>
          <Select label="Twitter card" value={settings.twitter_card} onChange={(value) => update("twitter_card", value as SiteSettings["twitter_card"])} options={["summary", "summary_large_image"]} />
          <ReadOnly label="Private album metadata policy" value="Private albums do not expose media lists to non-admin users." />
        </Panel>
      ) : null}

      {activeTab === "security" ? (
        <Panel title="Security" description="Read-only protection checks. Values that come from environment variables are not editable here.">
          <div className="grid gap-3 md:grid-cols-2">
            <Status label="Current user is admin" ok={Boolean(systemHealth.currentAdmin?.isAdmin)} />
            <Status label="DEFAULT_OWNER_ID configured" ok={systemHealth.env.DEFAULT_OWNER_ID} />
            <Status label="Service role key server-only" ok={systemHealth.env.SUPABASE_SERVICE_ROLE_KEY} />
            <Status label="Upload validation enabled" ok />
            <Status label="Private album leak protection" ok />
            <Status label=".env.local ignored by Git" ok />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Admin mutations per window" value={settings.admin_mutation_rate_limit_count} min={1} max={2000} onChange={(value) => update("admin_mutation_rate_limit_count", value)} />
            <NumberField label="Admin mutation window seconds" value={settings.admin_mutation_rate_limit_window_seconds} min={10} max={86400} onChange={(value) => update("admin_mutation_rate_limit_window_seconds", value)} />
            <NumberField label="Uploads per window" value={settings.upload_rate_limit_count} min={1} max={500} onChange={(value) => update("upload_rate_limit_count", value)} />
            <NumberField label="Upload window seconds" value={settings.upload_rate_limit_window_seconds} min={10} max={86400} onChange={(value) => update("upload_rate_limit_window_seconds", value)} />
          </div>
          <ReadOnly label="Current admin ID" value={systemHealth.currentAdmin?.userId.value ?? "Not available"} />
          <ReadOnly label="Current admin email" value={systemHealth.currentAdmin?.email ?? "Not available"} />
        </Panel>
      ) : null}

      {activeTab === "storage" ? (
        <Panel title="Storage / R2" description="R2 diagnostics without exposing access keys or secret keys.">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnly label="R2 bucket" value={systemHealth.r2Bucket.value ?? (systemHealth.r2Bucket.present ? "Configured" : "Missing")} />
            <ReadOnly label="R2 public URL" value={systemHealth.r2PublicUrl ?? "Missing"} />
          </div>
          <div className="rounded-[1.1rem] border border-border bg-background/55 p-4">
            <Button onClick={checkR2}>
              <HardDrive className="h-4 w-4" />
              Check R2 connection
            </Button>
            <p className="mt-3 text-sm text-text-secondary" aria-live="polite">{r2Result}</p>
          </div>
          <ReadOnly label="Estimated storage item count" value={`${systemHealth.counts.media ?? 0} media row(s)`} />
          <Toggle label="Allow original/source downloads" checked={settings.allow_original_downloads} onChange={(value) => update("allow_original_downloads", value)} />
          <Toggle label="Disable public right click affordance" checked={settings.disable_public_right_click} onChange={(value) => update("disable_public_right_click", value)} />
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Downloads per window" value={settings.download_rate_limit_count} min={1} max={2000} onChange={(value) => update("download_rate_limit_count", value)} />
            <NumberField label="Download window seconds" value={settings.download_rate_limit_window_seconds} min={10} max={86400} onChange={(value) => update("download_rate_limit_window_seconds", value)} />
          </div>
        </Panel>
      ) : null}

      {activeTab === "performance" ? (
        <Panel title="Performance" description="Settings and implementation notes that keep Studio responsive.">
          <Toggle label="Use thumbnails in grid" checked={settings.use_thumbnails_in_grid} onChange={(value) => update("use_thumbnails_in_grid", value)} />
          <NumberField label="Albums per page" value={settings.albums_per_page} min={6} max={100} onChange={(value) => update("albums_per_page", value)} />
          <NumberField label="Media per page" value={settings.media_per_page} min={12} max={200} onChange={(value) => update("media_per_page", value)} />
          <ReadOnly label="Viewer loading" value="Large viewer and upload UI are isolated to their Studio pages." />
          <ReadOnly label="Vercel Speed Insights" value="Review Core Web Vitals in the Vercel project dashboard if enabled." />
          <ReadOnly label="Cache policy" value="Admin pages use dynamic, no-store server data." />
        </Panel>
      ) : null}

      {activeTab === "danger" ? (
        <Panel title="Danger Zone" description="Actions here require confirmation and are admin-only.">
          <div className="grid gap-3 md:grid-cols-2">
            <ActionCard icon={<RotateCcw className="h-4 w-4" />} title="Recalculate album counts" body="Refresh media, comment, and like counters from database rows." actionLabel="Recalculate" onAction={recalculateCounts} />
            <ActionCard icon={<Database className="h-4 w-4" />} title="Clear cached UI state" body="Clears this browser's local display preferences only." actionLabel="Clear local state" onAction={clearUiState} />
          </div>
          <Toggle label="Use soft delete / trash instead of immediate purge" checked={settings.enable_soft_delete} onChange={(value) => update("enable_soft_delete", value)} />
          <NumberField label="Trash retention days" value={settings.soft_delete_retention_days} min={1} max={365} onChange={(value) => update("soft_delete_retention_days", value)} />
          <p className="text-sm text-text-secondary" aria-live="polite">{dangerResult}</p>
        </Panel>
      ) : null}

      <section className="rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Supabase tables</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {systemHealth.tableChecks.map((check) => (
            <Status key={check.table} label={check.table} ok={check.ok} />
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {envRows.map(([key, present]) => (
            <Status key={key} label={key} ok={present} />
          ))}
        </div>
      </section>

      {/* Sticky Save Bar for Settings and Landing (About handles its own) */}
      {activeTab !== "about" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 rounded-full border border-border bg-background/80 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-text-primary/10 transition-all">
          <div className="relative flex items-center h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              {message || landingMessage ? (
                <motion.div key="msg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <span className="truncate max-w-[200px] sm:max-w-[300px]">{activeTab === "landing" ? landingMessage : message}</span>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm font-medium text-text-secondary hidden sm:flex">
                  <AlertCircle className="h-4 w-4" /> Unsaved changes will be lost
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button 
            onClick={activeTab === "landing" ? saveLanding : save} 
            disabled={activeTab === "landing" ? savingLanding : saving} 
            className="rounded-full shrink-0"
          >
            <Save className="h-4 w-4 mr-2" />
            {activeTab === "landing" 
              ? (savingLanding ? "Saving..." : "Save Landing") 
              : (saving ? "Saving..." : "Save Settings")}
          </Button>
        </div>
      )}
    </section>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Settings</p>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ImageField({
  label,
  value,
  onValue,
  onUpload,
}: {
  label: string;
  value: string;
  onValue: (value: string) => void;
  onUpload: (file: File | null) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-[1.1rem] border border-border bg-background/55 p-3">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-surface-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <Input value={value} onChange={(event) => onValue(event.target.value)} placeholder="https://..." />
      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-text-primary transition hover:bg-background">
        <ImageUp className="h-4 w-4" />
        Upload
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function StatFields({
  label,
  value,
  caption,
  onValue,
  onCaption,
}: {
  label: string;
  value: string;
  caption: string;
  onValue: (value: string) => void;
  onCaption: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[1.1rem] border border-border bg-background/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <Input value={value} onChange={(event) => onValue(event.target.value)} placeholder="Value" maxLength={40} />
      <Input value={caption} onChange={(event) => onCaption(event.target.value)} placeholder="Label" maxLength={40} />
    </div>
  );
}

function LandingPreview({ landing, activeLandingLocale = "en" }: { landing: LandingPageContent, activeLandingLocale?: string }) {
  const trans = landing.translations?.[activeLandingLocale] || {};
  const headline = trans.headline || landing.headline;
  const eyebrow = trans.eyebrow || landing.eyebrow;
  const subheadline = trans.subheadline || landing.subheadline;
  const primaryCtaLabel = trans.primary_cta_label || landing.primary_cta_label;
  const secondaryCtaLabel = trans.secondary_cta_label || landing.secondary_cta_label;
  const statOneLabel = trans.stat_one_label || landing.stat_one_label;
  const statOneValue = trans.stat_one_value || landing.stat_one_value;
  const statTwoLabel = trans.stat_two_label || landing.stat_two_label;
  const statTwoValue = trans.stat_two_value || landing.stat_two_value;
  const statThreeLabel = trans.stat_three_label || landing.stat_three_label;
  const statThreeValue = trans.stat_three_value || landing.stat_three_value;

  return (
    <aside className="sticky top-24 min-w-0 self-start overflow-hidden rounded-[1.4rem] border border-border bg-background shadow-2xl shadow-text-primary/10">
      <div className="relative min-h-[34rem] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={landing.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.70),rgba(0,0,0,0.22)_62%,rgba(0,0,0,0.08))]" />
        <div className="relative z-10 flex min-h-[34rem] flex-col justify-end p-5 text-white sm:p-8">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] text-white/78">{eyebrow}</p>
          <h3 className="mt-3 break-words text-4xl font-semibold leading-none sm:text-5xl">{headline}</h3>
          <p className="mt-4 break-words text-sm leading-6 text-white/82">{subheadline}</p>
          <div className="mt-5 grid overflow-hidden rounded-[1.1rem] border border-white/18 bg-white/12 backdrop-blur">
            {[
              [statOneValue, statOneLabel],
              [statTwoValue, statTwoLabel],
              [statThreeValue, statThreeLabel],
            ].map(([value, caption]) => (
              <div key={`${value}-${caption}`} className="border-b border-white/14 p-4 last:border-b-0">
                <p className="break-words font-semibold">{value}</p>
                <p className="mt-1 break-words text-[0.65rem] uppercase tracking-[0.1em] text-white/68">{caption}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <span className="rounded-full bg-white px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-primary">
              {primaryCtaLabel}
            </span>
            <span className="rounded-full border border-white/24 bg-white/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-white">
              {secondaryCtaLabel}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      {children}
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
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

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-background/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-2 break-words text-sm text-text-primary">{value}</p>
    </div>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.1rem] border border-border bg-background/55 p-3">
      <CheckCircle2 className={`h-4 w-4 ${ok ? "text-muted-accent" : "text-text-secondary"}`} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{ok ? "OK" : "Needs attention"}</p>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-background/55 p-4">
      <div className="flex items-center gap-2 text-text-primary">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
      <Button variant="secondary" className="mt-4" onClick={onAction}>
        <ShieldCheck className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}
