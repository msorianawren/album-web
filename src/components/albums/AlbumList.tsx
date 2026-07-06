import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";

interface AlbumListProps {
  albums: Album[];
}

export function AlbumList({ albums }: AlbumListProps) {
  if (!albums.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          No albums yet
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          Create your first album and start organizing photos into clean,
          shareable collections.
        </p>
        <Button className="mt-6">Create album</Button>
      </section>
    );
  }

  return (
    <section
      id="albums"
      className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12"
    >
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Featured Albums
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Browse public, updating, and locked private collections.
          </p>
        </div>
      </div>
      <form className="mb-8 grid gap-3 rounded-3xl border border-border bg-surface p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          placeholder="Search album title or description"
          className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          name="status"
          className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="">All statuses</option>
          <option value="public">Public</option>
          <option value="updating">Updating</option>
          <option value="private">Private</option>
        </select>
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
