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
          No albums available
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          Public collections will appear here when the owner publishes them.
        </p>
      </section>
    );
  }

  return (
    <section
      id="albums"
      className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12"
    >
      <div className="mb-7 flex items-end justify-between gap-4 animate-editorial-in">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
            Selected books
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Featured Portfolio Albums
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Browse public editorials, updating shoots, and private client books.
          </p>
        </div>
      </div>
      <form className="mb-8 grid gap-3 rounded-[2rem] border border-border bg-surface/70 p-4 shadow-xl shadow-text-primary/5 backdrop-blur md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          placeholder="Search editorial, studio, campaign..."
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        />
        <select
          name="status"
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
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
