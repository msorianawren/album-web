import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";

interface AlbumListProps {
  albums: Album[];
  dict?: any;
}

export function AlbumList({ albums, dict }: AlbumListProps) {
  if (!albums.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          {dict?.albums?.no_albums || "No albums available"}
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          {dict?.albums?.no_albums_desc || "Public collections will appear here when the owner publishes them."}
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
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
            Selected books
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary sm:text-3xl">
            {dict?.albums?.public_albums || "Public Albums"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {dict?.albums?.public_albums_desc || "Browse public editorials, updating shoots, and featured works."}
          </p>
        </div>
      </div>
      <form action="/albums" className="mb-8 grid gap-3 rounded-[1.3rem] border border-border bg-surface/75 p-3 shadow-xl shadow-text-primary/5 backdrop-blur sm:rounded-[1.6rem] sm:p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          placeholder={dict?.albums?.search_placeholder || "Search editorial, studio, campaign..."}
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        />
        <select
          name="status"
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="">{dict?.albums?.all_statuses || "All statuses"}</option>
          <option value="public">{dict?.albums?.status_public || "Public"}</option>
          <option value="updating">{dict?.albums?.status_updating || "Updating"}</option>
          <option value="private">{dict?.albums?.status_private || "Private"}</option>
        </select>
        <Button type="submit" className="w-full md:w-auto">{dict?.common?.search || "Search"}</Button>
      </form>
      
      {albums.filter((a) => a.status !== "private").length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-20">
          {albums
            .filter((a) => a.status !== "private")
            .map((album) => (
              <AlbumCard key={album.id} album={album} dict={dict} />
            ))}
        </div>
      )}

      {albums.filter((a) => a.status === "private").length > 0 && (
        <div className="mt-10 border-t border-border pt-16">
          <div className="mb-7">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {dict?.albums?.private_albums || "Private Albums"}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {dict?.albums?.private_albums_desc || "These collections are restricted. You must request admin permission to view them."}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {albums
              .filter((a) => a.status === "private")
              .map((album) => (
                <AlbumCard key={album.id} album={album} dict={dict} />
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
