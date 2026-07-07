"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, ImagePlus, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Album, AlbumStatus, LandingPageContent } from "@/lib/types";

interface StudioDashboardProps {
  initialAlbums: Album[];
  initialLanding: LandingPageContent;
}

interface QueuedFile {
  id: string;
  file: File;
  url: string;
}

type LandingImageField = "hero_image_url" | "portrait_image_url" | "gallery_image_url";

export function StudioDashboard({ initialAlbums, initialLanding }: StudioDashboardProps) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [landing, setLanding] = useState(initialLanding);
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialAlbums[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [uploadingLandingSlot, setUploadingLandingSlot] = useState<LandingImageField | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug") || undefined,
        description: formData.get("description"),
        status: formData.get("status"),
      }),
    });
    const payload = await response.json();

    if (payload.success) {
      setAlbums((current) => [payload.data.album, ...current]);
      setSelectedAlbumId(payload.data.album.id);
      setMessage("Album created.");
      form.reset();
    } else {
      setMessage(payload.message ?? "Album create failed.");
    }
  }

  async function updateStatus(albumId: string, status: AlbumStatus) {
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (payload.success) {
      setAlbums((current) =>
        current.map((album) =>
          album.id === albumId ? { ...album, status } : album,
        ),
      );
      setMessage("Status updated.");
    } else {
      setMessage(payload.message ?? "Status update failed.");
    }
  }

  async function updateAlbum(event: FormEvent<HTMLFormElement>, albumId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        status: formData.get("status"),
        cover_url: formData.get("cover_url") || null,
      }),
    });
    const payload = await response.json();

    if (payload.success) {
      setAlbums((current) =>
        current.map((album) =>
          album.id === albumId ? { ...album, ...payload.data.album } : album,
        ),
      );
      setMessage("Album updated.");
    } else {
      setMessage(payload.message ?? "Album update failed.");
    }
  }

  async function deleteAlbum(albumId: string) {
    const response = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
    const payload = await response.json();

    if (payload.success) {
      setAlbums((current) => current.filter((album) => album.id !== albumId));
      setMessage("Album deleted.");
    } else {
      setMessage(payload.message ?? "Delete failed.");
    }
  }

  function updateLandingField(field: keyof LandingPageContent, value: string) {
    setLanding((current) => ({ ...current, [field]: value }));
  }

  async function saveLanding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLanding(true);
    setMessage("Saving landing page...");

    const response = await fetch("/api/landing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(landing),
    });
    const payload = await response.json();

    if (payload.success) {
      setLanding(payload.data.landing);
      setMessage("Landing page saved.");
    } else {
      setMessage(payload.message ?? "Landing page save failed.");
    }

    setSavingLanding(false);
  }

  async function uploadLandingAsset(event: ChangeEvent<HTMLInputElement>, field: LandingImageField) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("slot", field.replace("_url", ""));
    setUploadingLandingSlot(field);
    setMessage("Uploading landing image...");

    const response = await fetch("/api/landing/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (payload.success) {
      updateLandingField(field, payload.data.asset.previewUrl);
      setMessage("Landing image uploaded. Save the landing page to publish it.");
    } else {
      setMessage(payload.message ?? "Landing image upload failed.");
    }

    setUploadingLandingSlot(null);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    setSelectedFiles((current) => [
      ...current,
      ...Array.from(event.target.files ?? []).map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function uploadFiles() {
    if (!selectedFiles.length || !selectedAlbumId) return;
    const formData = new FormData();
    formData.set("albumId", selectedAlbumId);

    for (const item of selectedFiles) {
      formData.append("files", item.file);
    }

    setUploading(true);
    setMessage("Uploading media...");
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    setMessage(
      payload.success
        ? `Uploaded ${payload.data.media.length} file(s).`
        : payload.message ?? "Upload failed.",
    );

    if (payload.success) {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.url));
      setSelectedFiles([]);
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbumId
            ? {
                ...album,
                media_count: album.media_count + payload.data.media.length,
                photo_count:
                  album.photo_count +
                  payload.data.media.filter(
                    (item: { media_type: string }) => item.media_type === "image",
                  ).length,
                video_count:
                  album.video_count +
                  payload.data.media.filter(
                    (item: { media_type: string }) => item.media_type === "video",
                  ).length,
              }
            : album,
        ),
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
  }

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-12">
      <aside className="rounded-[2rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          Studio
        </p>
        <nav className="mt-6 grid gap-2 text-sm font-medium text-text-secondary">
          {["Dashboard", "Landing", "Albums", "Uploads", "Comments", "Settings"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="rounded-xl px-3 py-2 hover:bg-background">
              {item}
            </a>
          ))}
          <Link href="/studio/security" className="rounded-xl px-3 py-2 hover:bg-background">
            Security
          </Link>
        </nav>
        <Button variant="secondary" className="mt-6 w-full" onClick={logout}>
          Logout
        </Button>
      </aside>

      <section className="grid gap-8">
        <div id="dashboard" className="rounded-[2rem] border border-border bg-surface/80 p-6 shadow-xl shadow-text-primary/5">
          <h1 className="text-3xl font-semibold text-text-primary">
            Admin Studio
          </h1>
          <p className="mt-2 text-text-secondary">
            Manage editorial books, covers, statuses, uploads, and public visibility.
          </p>
          <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
            {message}
          </p>
        </div>

        <form
          id="landing"
          className="grid gap-6 rounded-[2rem] border border-border bg-surface/90 p-6 shadow-xl shadow-text-primary/5"
          onSubmit={saveLanding}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
                Landing page
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                Edit public introduction
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Update the first impression visitors see on the homepage.
              </p>
            </div>
            <Button type="submit" disabled={savingLanding}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {savingLanding ? "Saving..." : "Save landing"}
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              value={landing.eyebrow}
              onChange={(event) => updateLandingField("eyebrow", event.target.value)}
              aria-label="Landing eyebrow"
              placeholder="Oriana Wren"
            />
            <Input
              value={landing.headline}
              onChange={(event) => updateLandingField("headline", event.target.value)}
              aria-label="Landing headline"
              placeholder="Main headline"
            />
            <Textarea
              value={landing.subheadline}
              onChange={(event) => updateLandingField("subheadline", event.target.value)}
              aria-label="Landing subheadline"
              placeholder="Short personal introduction"
              className="lg:col-span-2"
            />
            <Textarea
              value={landing.body}
              onChange={(event) => updateLandingField("body", event.target.value)}
              aria-label="Landing body"
              placeholder="Supporting body"
              className="lg:col-span-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              value={landing.primary_cta_label}
              onChange={(event) => updateLandingField("primary_cta_label", event.target.value)}
              aria-label="Primary CTA label"
              placeholder="Primary button label"
            />
            <Input
              value={landing.primary_cta_href}
              onChange={(event) => updateLandingField("primary_cta_href", event.target.value)}
              aria-label="Primary CTA link"
              placeholder="#albums"
            />
            <Input
              value={landing.secondary_cta_label}
              onChange={(event) => updateLandingField("secondary_cta_label", event.target.value)}
              aria-label="Secondary CTA label"
              placeholder="Secondary button label"
            />
            <Input
              value={landing.secondary_cta_href}
              onChange={(event) => updateLandingField("secondary_cta_href", event.target.value)}
              aria-label="Secondary CTA link"
              placeholder="/about"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {([
              ["hero_image_url", "Hero image"],
              ["portrait_image_url", "Portrait image"],
              ["gallery_image_url", "Gallery image"],
            ] as const).map(([field, label]) => (
              <div key={field} className="rounded-[1.4rem] border border-border bg-background/60 p-3">
                <div className="relative overflow-hidden rounded-[1rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={landing[field]}
                    alt=""
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  {label}
                </label>
                <Input
                  value={landing[field]}
                  onChange={(event) => updateLandingField(field, event.target.value)}
                  aria-label={label}
                  className="mt-2"
                />
                <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition hover:-translate-y-0.5">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {uploadingLandingSlot === field ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    disabled={uploadingLandingSlot !== null}
                    onChange={(event) => uploadLandingAsset(event, field)}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              value={landing.feature_title}
              onChange={(event) => updateLandingField("feature_title", event.target.value)}
              aria-label="Feature title"
              placeholder="Feature title"
            />
            <Textarea
              value={landing.feature_body}
              onChange={(event) => updateLandingField("feature_body", event.target.value)}
              aria-label="Feature body"
              placeholder="Feature body"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {([
              ["stat_one_label", "stat_one_value"],
              ["stat_two_label", "stat_two_value"],
              ["stat_three_label", "stat_three_value"],
            ] as const).map(([labelField, valueField], index) => (
              <div key={labelField} className="grid gap-2 rounded-[1.2rem] border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  Stat {index + 1}
                </p>
                <Input
                  value={landing[valueField]}
                  onChange={(event) => updateLandingField(valueField, event.target.value)}
                  aria-label={`Stat ${index + 1} value`}
                  placeholder="Value"
                />
                <Input
                  value={landing[labelField]}
                  onChange={(event) => updateLandingField(labelField, event.target.value)}
                  aria-label={`Stat ${index + 1} label`}
                  placeholder="Label"
                />
              </div>
            ))}
          </div>
        </form>

        <form
          id="albums"
          className="grid gap-4 rounded-[2rem] border border-border bg-surface/80 p-6 shadow-xl shadow-text-primary/5"
          onSubmit={createAlbum}
        >
          <h2 className="text-2xl font-semibold text-text-primary">
            Create album
          </h2>
          <Input name="title" placeholder="Album title" required />
          <Input name="slug" placeholder="optional-custom-slug" />
          <Input name="cover_url" placeholder="Cover image URL (optional)" />
          <Textarea name="description" placeholder="Album description" />
          <select
            name="status"
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue="public"
          >
            <option value="public">Public</option>
            <option value="updating">Updating</option>
            <option value="private">Private</option>
          </select>
          <Button type="submit">Create album</Button>
        </form>

        <div id="uploads" className="rounded-[2rem] border border-border bg-surface/80 p-6 shadow-xl shadow-text-primary/5">
          <h2 className="text-2xl font-semibold text-text-primary">
            Upload media
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedAlbumId}
              onChange={(event) => setSelectedAlbumId(event.target.value)}
              className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </select>
            <Button onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Select files
            </Button>
          </div>
          {selectedFiles.length ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-text-secondary">
                  {selectedFiles.length} selected file(s)
                </p>
                <Button onClick={uploadFiles} disabled={uploading}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {uploading ? "Uploading..." : "Upload selected"}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {selectedFiles.map((preview, index) => (
                  <div
                    key={preview.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-background"
                  >
                    <div className="relative aspect-[4/5]">
                      {preview.file.type.startsWith("image/") ? (
                        <Image
                          src={preview.url}
                          alt={preview.file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <video
                          src={preview.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-lightbox text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => removeSelectedFile(index)}
                      aria-label={`Remove ${preview.file.name}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <p className="truncate px-3 py-2 text-xs text-text-secondary">
                      {preview.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
            multiple
            className="sr-only"
            onChange={selectFiles}
          />
        </div>

        <div className="grid gap-4">
          {albums.map((album) => (
            <article key={album.id} className="rounded-[2rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {album.title}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {album.media_count} media · {album.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={album.status}
                    onChange={(event) =>
                      updateStatus(album.id, event.target.value as AlbumStatus)
                    }
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="updating">Updating</option>
                    <option value="private">Private</option>
                  </select>
                  <Link
                    href={`/albums/${album.slug}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    View
                  </Link>
                  <Button variant="secondary" onClick={() => deleteAlbum(album.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>
              <form
                className="mt-5 grid gap-3 border-t border-border pt-5 md:grid-cols-2"
                onSubmit={(event) => updateAlbum(event, album.id)}
              >
                <Input name="title" defaultValue={album.title} aria-label="Album title" />
                <Input
                  name="cover_url"
                  defaultValue={album.cover_url ?? ""}
                  aria-label="Album cover URL"
                  placeholder="Cover URL"
                />
                <Textarea
                  name="description"
                  defaultValue={album.description ?? ""}
                  aria-label="Album description"
                  className="md:col-span-2"
                />
                <select
                  name="status"
                  defaultValue={album.status}
                  className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="public">Public</option>
                  <option value="updating">Updating</option>
                  <option value="private">Private</option>
                </select>
                <Button type="submit">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save album
                </Button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
