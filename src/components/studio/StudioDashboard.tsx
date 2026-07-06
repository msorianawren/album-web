"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Album, AlbumStatus } from "@/lib/types";

interface StudioDashboardProps {
  initialAlbums: Album[];
}

export function StudioDashboard({ initialAlbums }: StudioDashboardProps) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialAlbums[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
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

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length || !selectedAlbumId) return;
    const formData = new FormData();
    formData.set("albumId", selectedAlbumId);

    for (const file of Array.from(event.target.files)) {
      formData.append("files", file);
    }

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

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-12">
      <aside className="rounded-[2rem] border border-border bg-surface p-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          Studio
        </p>
        <nav className="mt-6 grid gap-2 text-sm font-medium text-text-secondary">
          {["Dashboard", "Albums", "Uploads", "Comments", "Settings"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="rounded-xl px-3 py-2 hover:bg-background">
              {item}
            </a>
          ))}
        </nav>
        <Button variant="secondary" className="mt-6 w-full" onClick={logout}>
          Logout
        </Button>
      </aside>

      <section className="grid gap-8">
        <div id="dashboard" className="rounded-[2rem] border border-border bg-surface p-6">
          <h1 className="text-3xl font-semibold text-text-primary">
            Admin Studio
          </h1>
          <p className="mt-2 text-text-secondary">
            Manage albums, statuses, uploads, and public visibility.
          </p>
          <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
            {message}
          </p>
        </div>

        <form
          id="albums"
          className="grid gap-4 rounded-[2rem] border border-border bg-surface p-6"
          onSubmit={createAlbum}
        >
          <h2 className="text-2xl font-semibold text-text-primary">
            Create album
          </h2>
          <Input name="title" placeholder="Album title" required />
          <Input name="slug" placeholder="optional-custom-slug" />
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

        <div id="uploads" className="rounded-[2rem] border border-border bg-surface p-6">
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
              <Upload className="h-4 w-4" aria-hidden="true" />
              Select files
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
            multiple
            className="sr-only"
            onChange={uploadFiles}
          />
        </div>

        <div className="grid gap-4">
          {albums.map((album) => (
            <article key={album.id} className="rounded-[2rem] border border-border bg-surface p-5">
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
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
