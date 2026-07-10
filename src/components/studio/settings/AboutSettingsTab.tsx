"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { AboutProfile } from "@/lib/types";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-border bg-background/55 p-4">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
}

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

function ArrayRepeater<T>({
  items,
  onChange,
  renderItem,
  emptyItem,
  title,
  addLabel
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (data: Partial<T>) => void) => React.ReactNode;
  emptyItem: Omit<T, "id">;
  title: string;
  addLabel: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">{title}</label>
        <Button variant="secondary" onClick={() => onChange([...items, { ...emptyItem, id: crypto.randomUUID() } as T])} className="h-8 px-3 text-[0.65rem]">
          <Plus className="h-3 w-3 mr-1" /> {addLabel}
        </Button>
      </div>
      <div className="grid gap-3">
        {items.length === 0 && (
          <p className="text-xs text-text-secondary italic">No items added.</p>
        )}
        {items.map((item, index) => (
          <div key={index} className="relative rounded-xl border border-border bg-surface/50 p-4">
            <Button
              variant="icon"
              className="absolute right-2 top-2 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:border-red-500/20"
              onClick={() => {
                const newItems = [...items];
                newItems.splice(index, 1);
                onChange(newItems);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <div className="grid gap-3 pr-8">
              {renderItem(item, index, (data) => {
                const newItems = [...items];
                newItems[index] = { ...item, ...data };
                onChange(newItems);
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutSettingsTab({ initialProfile, uploadAsset, onUpdate }: AboutSettingsTabProps) {
  const [profile, setProfile] = useState<AboutProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onUpdate(profile);
      setSuccessMsg("Profile saved successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save profile.");
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
        <div className="flex items-center gap-4">
          {errorMsg && <p className="text-sm font-medium text-red-500">{errorMsg}</p>}
          {successMsg && <p className="text-sm font-medium text-green-500">{successMsg}</p>}
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>

      <Section title="Hero Information" description="The primary details shown at the top of your biography.">
        <div className="mb-4">
          <Toggle 
            label="Public Profile Enabled" 
            checked={profile.is_public ?? true} 
            onChange={(val) => update("is_public", val)} 
          />
          {profile.is_public === false && (
            <p className="mt-2 text-sm text-amber-500">
              Warning: Your About page is currently private and will not be shown to the public.
            </p>
          )}
        </div>
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

      <Section title="Personal Metrics" description="Basic physical or personal attributes.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Age"><Input value={profile.personal_metrics?.age ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, age: e.target.value })} /></Field>
          <Field label="Height"><Input value={profile.personal_metrics?.height ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, height: e.target.value })} /></Field>
          <Field label="Weight"><Input value={profile.personal_metrics?.weight ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, weight: e.target.value })} /></Field>
          <Field label="Measurements"><Input value={profile.personal_metrics?.measurements ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, measurements: e.target.value })} /></Field>
          <Field label="IQ"><Input value={profile.personal_metrics?.iq ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, iq: e.target.value })} /></Field>
          <Field label="EQ"><Input value={profile.personal_metrics?.eq ?? ""} onChange={(e) => update("personal_metrics", { ...profile.personal_metrics, eq: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Skills & Traits" description="Arrays of strings for skills, languages, etc.">
        <Field label="Skills (comma-separated)">
          <Input 
            value={profile.skills?.join(", ") ?? ""} 
            onChange={(e) => update("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
          />
        </Field>
        <Field label="Personality Traits (comma-separated)">
          <Input 
            value={profile.personality_traits?.join(", ") ?? ""} 
            onChange={(e) => update("personality_traits", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
          />
        </Field>
        <Field label="Hobbies (comma-separated)">
          <Input 
            value={profile.hobbies?.map(h => h.name).join(", ") ?? ""} 
            onChange={(e) => update("hobbies", e.target.value.split(",").map(s => ({ id: crypto.randomUUID(), name: s.trim() })).filter(h => h.name))} 
          />
        </Field>
      </Section>

      <Section title="Career & Education" description="Your professional and academic journey.">
        <ArrayRepeater
          title="Career"
          addLabel="Add Role"
          items={profile.career ?? []}
          onChange={(items) => update("career", items)}
          emptyItem={{ role: "", company: "", period: "", description: "" }}
          renderItem={(item, index, updateItem) => (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Role"><Input value={item.role} onChange={e => updateItem({ role: e.target.value })} /></Field>
                <Field label="Company"><Input value={item.company} onChange={e => updateItem({ company: e.target.value })} /></Field>
              </div>
              <Field label="Period"><Input value={item.period} onChange={e => updateItem({ period: e.target.value })} placeholder="e.g., 2020 - Present" /></Field>
              <Field label="Description"><Textarea value={item.description} onChange={e => updateItem({ description: e.target.value })} /></Field>
            </>
          )}
        />
        <div className="my-8 border-t border-border" />
        <ArrayRepeater
          title="Education"
          addLabel="Add Education"
          items={profile.education ?? []}
          onChange={(items) => update("education", items)}
          emptyItem={{ school: "", program: "", period: "", description: "" }}
          renderItem={(item, index, updateItem) => (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Program"><Input value={item.program} onChange={e => updateItem({ program: e.target.value })} /></Field>
                <Field label="School"><Input value={item.school} onChange={e => updateItem({ school: e.target.value })} /></Field>
              </div>
              <Field label="Period"><Input value={item.period} onChange={e => updateItem({ period: e.target.value })} placeholder="e.g., 2016 - 2020" /></Field>
              <Field label="Description"><Textarea value={item.description} onChange={e => updateItem({ description: e.target.value })} /></Field>
            </>
          )}
        />
      </Section>

      <Section title="Achievements" description="Awards and recognitions.">
        <ArrayRepeater
          title="Awards & Recognitions"
          addLabel="Add Award"
          items={profile.achievements ?? []}
          onChange={(items) => update("achievements", items)}
          emptyItem={{ title: "", year: "", description: "" }}
          renderItem={(item, index, updateItem) => (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title"><Input value={item.title} onChange={e => updateItem({ title: e.target.value })} /></Field>
                <Field label="Year"><Input value={item.year} onChange={e => updateItem({ year: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Textarea value={item.description} onChange={e => updateItem({ description: e.target.value })} /></Field>
            </>
          )}
        />
      </Section>

      <Section title="Languages & Social" description="Languages spoken and social media presence.">
        <ArrayRepeater
          title="Languages"
          addLabel="Add Language"
          items={profile.languages ?? []}
          onChange={(items) => update("languages", items)}
          emptyItem={{ language: "", proficiency: "" }}
          renderItem={(item, index, updateItem) => (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Language"><Input value={item.language} onChange={e => updateItem({ language: e.target.value })} /></Field>
              <Field label="Proficiency"><Input value={item.proficiency} onChange={e => updateItem({ proficiency: e.target.value })} placeholder="e.g., Native, Fluent, Beginner" /></Field>
            </div>
          )}
        />
        <div className="my-8 border-t border-border" />
        <ArrayRepeater
          title="Social Links"
          addLabel="Add Link"
          items={profile.social_links ?? []}
          onChange={(items) => update("social_links", items)}
          emptyItem={{ platform: "", url: "" }}
          renderItem={(item, index, updateItem) => (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Platform"><Input value={item.platform} onChange={e => updateItem({ platform: e.target.value })} placeholder="e.g., Instagram" /></Field>
              <Field label="URL"><Input value={item.url} onChange={e => updateItem({ url: e.target.value })} /></Field>
            </div>
          )}
        />
      </Section>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
