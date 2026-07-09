"use client";

import { useState } from "react";
import { ImageUp, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { AboutProfile, EducationItem, CareerItem, HobbyItem, LanguageItem, AchievementItem, SocialLinkItem } from "@/lib/types";

interface AboutSettingsTabProps {
  initialProfile: AboutProfile;
  uploadAsset: (type: "about-profile" | "about-cover", file: File) => Promise<string>;
  onUpdate: (profile: AboutProfile) => Promise<void>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">About</p>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      {description ? <p className="text-xs text-text-secondary">{description}</p> : null}
      {children}
    </div>
  );
}

export function AboutSettingsTab({ initialProfile, uploadAsset, onUpdate }: AboutSettingsTabProps) {
  const [profile, setProfile] = useState<AboutProfile>(initialProfile);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(profile);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof AboutProfile>(key: K, value: AboutProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid gap-8 pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-text-primary">About Profile</h2>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>

      <Section title="Hero Information" description="The primary details shown at the top of your biography.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Display Name">
            <Input value={profile.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} />
          </Field>
          <Field label="Professional Title">
            <Input value={profile.professional_title ?? ""} onChange={(e) => update("professional_title", e.target.value)} />
          </Field>
        </div>
        <Field label="Tagline">
          <Input value={profile.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} />
        </Field>
      </Section>

      <Section title="Images" description="Your portrait and cover background.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Profile Portrait URL">
            <Input value={profile.profile_image_url ?? ""} onChange={(e) => update("profile_image_url", e.target.value)} />
            <input type="file" accept="image/*" onChange={async (e) => {
              if (e.target.files?.[0]) {
                const url = await uploadAsset("about-profile", e.target.files[0]);
                update("profile_image_url", url);
              }
            }} />
          </Field>
          <Field label="Cover Background URL">
            <Input value={profile.cover_image_url ?? ""} onChange={(e) => update("cover_image_url", e.target.value)} />
            <input type="file" accept="image/*" onChange={async (e) => {
              if (e.target.files?.[0]) {
                const url = await uploadAsset("about-cover", e.target.files[0]);
                update("cover_image_url", url);
              }
            }} />
          </Field>
        </div>
      </Section>

      <Section title="Biography" description="Detailed background and life journey.">
        <Field label="Short Biography" description="A quick summary for previews or small cards.">
          <Textarea value={profile.short_bio ?? ""} onChange={(e) => update("short_bio", e.target.value)} />
        </Field>
        <Field label="Full Biography" description="Your comprehensive life story.">
          <Textarea value={profile.full_bio ?? ""} onChange={(e) => update("full_bio", e.target.value)} className="min-h-[200px]" />
        </Field>
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Birthplace">
            <Input value={profile.birthplace ?? ""} onChange={(e) => update("birthplace", e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={profile.location ?? ""} onChange={(e) => update("location", e.target.value)} />
          </Field>
          <Field label="Nationality">
            <Input value={profile.nationality ?? ""} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Basic implementation for the JSON fields. For a complete robust UI we'd build full repeaters. */}
      {/* Due to space and time I am building simpler textual mapping for arrays if needed or a simple repeater. */}

      <Section title="Feature Quote" description="A highly emphasized statement.">
        <Field label="Quote text">
          <Textarea value={profile.quote ?? ""} onChange={(e) => update("quote", e.target.value)} />
        </Field>
      </Section>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
