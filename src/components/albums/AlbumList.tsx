import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface AlbumListProps {
  albums: Album[];
  dict?: any;
  locale?: string;
}

export function AlbumList({ albums, dict, locale = "en" }: AlbumListProps) {
  if (!albums.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-surface-secondary border border-border/50">
          <Camera className="h-8 w-8 text-text-secondary/50" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-text-primary mb-4">
          {dict?.albums?.no_albums || "No albums available"}
        </h2>
        <p className="max-w-md text-[0.95rem] text-text-secondary font-light">
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
      <ScrollReveal className="mb-7 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-text-secondary mb-3">
            Selected books
          </p>
          <h2 className="font-serif text-3xl font-normal text-text-primary sm:text-4xl mb-4">
            {dict?.albums?.public_albums || "Public Albums"}
          </h2>
          <p className="text-[0.95rem] font-light text-text-secondary">
            {dict?.albums?.public_albums_desc || "Browse public editorials, updating shoots, and featured works."}
          </p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.1}>
        <form action="/albums" className="mb-8 grid gap-3 rounded-[1.3rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md sm:rounded-[1.6rem] sm:p-4 md:grid-cols-[1fr_180px_auto]">
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
      </ScrollReveal>
      
      {albums.filter((a) => a.status !== "private").length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-20">
          {albums
            .filter((a) => a.status !== "private")
            .map((album) => (
              <AlbumCard key={album.id} album={album} dict={dict} locale={locale} />
            ))}
        </div>
      )}

      {albums.filter((a) => a.status === "private").length > 0 && (
        <div className="mt-16 border-t border-border pt-16">
          <div className="mb-14 max-w-2xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-text-secondary mb-3">
              Restricted Access
            </p>
            <h2 className="font-serif text-3xl font-normal text-text-primary sm:text-4xl mb-4">
              {dict?.albums?.private_albums || "Private Albums"}
            </h2>
            <p className="text-[0.95rem] font-light leading-[1.6] text-text-secondary">
              {dict?.albums?.private_albums_desc || "These collections are reserved for authorized guests. You must request private access to view them."}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {albums
              .filter((a) => a.status === "private")
              .map((album) => (
                <AlbumCard key={album.id} album={album} dict={dict} locale={locale} />
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
