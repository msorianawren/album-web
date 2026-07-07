"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { AlbumStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function AlbumForm({ defaultStatus = "private" }: { defaultStatus?: AlbumStatus }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<AlbumStatus>(defaultStatus);
  const [coverUrl, setCoverUrl] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("Creating album...");
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug || undefined,
        description: description || null,
        status,
        cover_url: coverUrl || null,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!payload.success) {
      setMessage(payload.message ?? "Create failed.");
      return;
    }
    setMessage("Album created.");
    router.push(`/studio/albums/${payload.data.album.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-xl shadow-text-primary/5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-text-primary">Title</span>
          <Input value={title} onChange={(event) => updateTitle(event.target.value)} required maxLength={120} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-text-primary">Slug</span>
          <Input
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            required
            maxLength={120}
          />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-text-primary">Description</span>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-text-primary">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AlbumStatus)}
            className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="private">private</option>
            <option value="updating">updating</option>
            <option value="public">public</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-text-primary">Cover image URL optional</span>
          <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://..." />
        </label>
      </div>
      <div className="grid gap-3 rounded-[1.1rem] border border-border bg-background/55 p-4 text-sm text-text-secondary md:grid-cols-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked readOnly className="h-4 w-4 accent-[var(--accent)]" />
          Comments follow global settings
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={status !== "private"} readOnly className="h-4 w-4 accent-[var(--accent)]" />
          Likes allowed when visible
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={status === "public"} readOnly className="h-4 w-4 accent-[var(--accent)]" />
          Downloads only when public
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary" aria-live="polite">{message}</p>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving" : "Create album"}
        </Button>
      </div>
    </form>
  );
}
