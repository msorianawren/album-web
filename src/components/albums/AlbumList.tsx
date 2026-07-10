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
      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 py-32 text-center">
        <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-surface/30 border border-border/40 text-text-secondary/30">
          <Camera className="h-10 w-10" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-normal text-text-primary mb-6">
          {dict?.albums?.no_albums || "No Archives Available"}
        </h2>
        <p className="max-w-[400px] text-[0.95rem] leading-[1.8] text-text-secondary font-light">
          {dict?.albums?.no_albums_desc || "Public collections will appear here when the owner publishes them."}
        </p>
      </section>
    );
  }

  return (
    <section
      id="albums"
      className="mx-auto w-full max-w-[1200px] px-6 pb-32"
    >
      <ScrollReveal className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="min-w-0 max-w-xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary mb-4 block">
            Selected Books
          </p>
          <h2 className="font-serif text-[2.2rem] md:text-5xl font-light text-text-primary mb-6 leading-none">
            {dict?.albums?.public_albums || "Public Archives"}
          </h2>
          <p className="text-[1rem] leading-[1.6] font-light text-text-secondary max-w-[420px]">
            {dict?.albums?.public_albums_desc || "Browse public editorials, updating diaries, and featured visual works."}
          </p>
        </div>

        <form action="/albums" className="flex items-center gap-3 w-full md:w-auto max-w-[500px]">
          <input
            name="q"
            placeholder={dict?.albums?.search_placeholder || "Search archives..."}
            className="w-full h-11 rounded-full border border-border/40 bg-surface/20 px-5 text-[0.8rem] text-text-primary placeholder:text-text-secondary/50 outline-none transition focus:border-text-primary/30"
          />
          <select
            name="status"
            className="shrink-0 h-11 rounded-full border border-border/40 bg-surface/20 px-4 text-[0.8rem] text-text-secondary outline-none transition focus:border-text-primary/30 appearance-none"
            defaultValue=""
          >
            <option value="">{dict?.albums?.all_statuses || "All"}</option>
            <option value="public">{dict?.albums?.status_public || "Public"}</option>
            <option value="updating">{dict?.albums?.status_updating || "Updating"}</option>
            <option value="private">{dict?.albums?.status_private || "Private"}</option>
          </select>
          <Button type="submit" variant="secondary" className="h-11 rounded-full px-5 text-[0.7rem] uppercase tracking-widest">{dict?.common?.search || "Find"}</Button>
        </form>
      </ScrollReveal>
      
      {albums.filter((a) => a.status !== "private").length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-24 border-t border-border/40 pt-16">
          {albums
            .filter((a) => a.status !== "private")
            .map((album) => (
              <AlbumCard key={album.id} album={album} dict={dict} locale={locale} />
            ))}
        </div>
      )}

      {albums.filter((a) => a.status === "private").length > 0 && (
        <div className="mt-20 border-t border-border/40 pt-20">
          <div className="mb-16 max-w-2xl">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary mb-4 block">
              Restricted Access
            </p>
            <h2 className="font-serif text-[2.2rem] md:text-5xl font-light text-text-primary mb-6 leading-none">
              {dict?.albums?.private_albums || "Private Archives"}
            </h2>
            <p className="text-[1rem] leading-[1.6] font-light text-text-secondary max-w-[420px]">
              {dict?.albums?.private_albums_desc || "These collections are reserved for authorized guests. You must request private access to view them."}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
