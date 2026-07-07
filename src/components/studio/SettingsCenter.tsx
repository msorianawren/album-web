"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Database, HardDrive, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { AlbumStatus, SiteSettings } from "@/lib/types";

type TabKey =
  | "general"
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
  systemHealth,
}: {
  initialSettings: SiteSettings;
  systemHealth: SystemHealthSummary;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [r2Result, setR2Result] = useState("");
  const [dangerResult, setDangerResult] = useState("");

  const envRows = useMemo(() => Object.entries(systemHealth.env), [systemHealth.env]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
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
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-secondary" aria-live="polite">{message}</p>
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving" : "Save settings"}
            </Button>
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
            <Field label="Logo URL">
              <Input value={settings.site_logo_url ?? ""} onChange={(event) => update("site_logo_url", event.target.value)} placeholder="https://..." />
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

      {activeTab === "appearance" ? (
        <Panel title="Appearance" description="Default presentation choices for the public album experience.">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Default theme" value={settings.default_theme} onChange={(value) => update("default_theme", value as SiteSettings["default_theme"])} options={["dark", "light", "system"]} />
            <Select label="Homepage layout" value={settings.homepage_layout} onChange={(value) => update("homepage_layout", value as SiteSettings["homepage_layout"])} options={["featured", "grid", "minimal"]} />
            <Select label="Album card density" value={settings.album_card_density} onChange={(value) => update("album_card_density", value as SiteSettings["album_card_density"])} options={["comfortable", "compact"]} />
          </div>
          <Toggle label="Show counts on cards" checked={settings.show_counts_on_cards} onChange={(value) => update("show_counts_on_cards", value)} />
          <Toggle label="Show updated date" checked={settings.show_updated_date} onChange={(value) => update("show_updated_date", value)} />
          <Toggle label="Show status badges" checked={settings.show_status_badges} onChange={(value) => update("show_status_badges", value)} />
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
          </div>
          <Toggle label="Enable image uploads" checked={settings.enable_image_uploads} onChange={(value) => update("enable_image_uploads", value)} />
          <Toggle label="Enable video uploads" checked={settings.enable_video_uploads} onChange={(value) => update("enable_video_uploads", value)} />
          <Toggle label="Auto-set first uploaded image as cover" checked={settings.auto_set_first_image_as_cover} onChange={(value) => update("auto_set_first_image_as_cover", value)} />
          <Toggle label="Show video posters" checked={settings.show_video_posters} onChange={(value) => update("show_video_posters", value)} />
          <Toggle label="Use thumbnails in grid" checked={settings.use_thumbnails_in_grid} onChange={(value) => update("use_thumbnails_in_grid", value)} />
          <ReadOnly label="Allowed image types" value={imageTypes.join(", ")} />
          <ReadOnly label="Allowed video types" value={videoTypes.join(", ")} />
        </Panel>
      ) : null}

      {activeTab === "comments" ? (
        <Panel title="Comments And Likes" description="Public interaction settings and moderation limits.">
          <Toggle label="Enable public comments" checked={settings.allow_public_comments} onChange={(value) => update("allow_public_comments", value)} />
          <Toggle label="Require comment name" checked={settings.require_comment_name} onChange={(value) => update("require_comment_name", value)} />
          <NumberField label="Max comment length" value={settings.max_comment_length} min={100} max={2000} onChange={(value) => update("max_comment_length", value)} />
          <Toggle label="Enable likes" checked={settings.enable_likes} onChange={(value) => update("enable_likes", value)} />
          <ReadOnly label="Spam throttle status" value="Handled by app middleware and Cloudflare rules." />
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
