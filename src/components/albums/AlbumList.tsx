"use client";

import { useMemo, useState } from "react";
import { Camera, CheckSquare, Square } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface AlbumListProps {
  albums: Album[];
  dict?: {
    albums?: Record<string, string>;
    common?: Record<string, string>;
  };
  locale?: string;
}

export function AlbumList({ albums, dict, locale = "en" }: AlbumListProps) {
  const [privatePage, setPrivatePage] = useState(1);
  const [privatePageSize, setPrivatePageSize] = useState(24);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const publicAlbums = useMemo(() => albums.filter((a) => a.status !== "private"), [albums]);
  const privateAlbums = useMemo(() => albums.filter((a) => a.status === "private"), [albums]);
  const selectablePrivateAlbums = useMemo(
    () => privateAlbums.filter((album) => !["approved", "pending", "revoked", "rejected", "denied", "needs_manual_review"].includes(album.access_request_status ?? "")),
    [privateAlbums],
  );
  const totalPrivatePages = Math.max(1, Math.ceil(privateAlbums.length / privatePageSize));
  const currentPrivatePage = Math.min(privatePage, totalPrivatePages);
  const visiblePrivateAlbums = privateAlbums.slice((currentPrivatePage - 1) * privatePageSize, currentPrivatePage * privatePageSize);
  const selectedAlbums = selectablePrivateAlbums.filter((album) => selectedIds.has(album.id));
  const selectedCount = selectedAlbums.length;

  const toggleSelected = (album: Album) => {
    if (!selectablePrivateAlbums.some((item) => item.id === album.id)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(album.id)) next.delete(album.id);
      else next.add(album.id);
      return next;
    });
  };

  const openRequestModal = (scope: "selected_albums" | "all_private") => {
    const detail =
      scope === "all_private"
        ? { scope, albums: [] }
        : { scope, albums: selectedAlbums.map((album) => ({ id: album.id, title: album.title, slug: album.slug })) };
    document.dispatchEvent(new CustomEvent("open-access-request", { detail }));
  };

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
      
      {publicAlbums.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-24 border-t border-border/40 pt-16">
          {publicAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} dict={dict} locale={locale} />
            ))}
        </div>
      )}

      {privateAlbums.length > 0 && (
        <div className="mt-20 border-t border-border/40 pt-20">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary mb-4 block">
                Restricted Access
              </p>
              <h2 className="font-serif text-[2.2rem] md:text-5xl font-light text-text-primary mb-6 leading-none">
                {dict?.albums?.private_albums || "Private Archives"}
              </h2>
              <p className="text-[1rem] leading-[1.6] font-light text-text-secondary max-w-[520px]">
                {dict?.albums?.private_albums_desc || "Select the private albums you want, then submit one access request for review."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span>
                Showing {(currentPrivatePage - 1) * privatePageSize + 1}-{Math.min(currentPrivatePage * privatePageSize, privateAlbums.length)} of {privateAlbums.length}
              </span>
              <select
                value={privatePageSize}
                onChange={(event) => {
                  setPrivatePageSize(Number(event.target.value));
                  setPrivatePage(1);
                }}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none"
              >
                {[12, 24, 48, 96].map((size) => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePrivateAlbums.map((album) => {
              const isSelectable = selectablePrivateAlbums.some((item) => item.id === album.id);
              const isSelected = selectedIds.has(album.id);
              return (
                <div key={album.id} className="relative">
                  <AlbumCard album={album} dict={dict} locale={locale} />
                  <button
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => toggleSelected(album)}
                    className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-text-primary shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={isSelected ? "Remove album from request" : "Select album for private access request"}
                  >
                    {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-12 flex flex-col gap-4 rounded-[1.5rem] border border-border bg-surface/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-text-secondary">
              Page <span className="font-semibold text-text-primary">{currentPrivatePage}</span> of <span className="font-semibold text-text-primary">{totalPrivatePages}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={currentPrivatePage === 1} onClick={() => setPrivatePage(1)}>First</Button>
              <Button variant="secondary" disabled={currentPrivatePage === 1} onClick={() => setPrivatePage((page) => Math.max(1, page - 1))}>Previous</Button>
              {Array.from({ length: Math.min(5, totalPrivatePages) }, (_, index) => {
                const start = Math.max(1, Math.min(currentPrivatePage - 2, totalPrivatePages - 4));
                const page = start + index;
                if (page > totalPrivatePages) return null;
                return (
                  <Button
                    key={page}
                    variant={page === currentPrivatePage ? "primary" : "secondary"}
                    onClick={() => setPrivatePage(page)}
                    className="w-11 px-0"
                  >
                    {page}
                  </Button>
                );
              })}
              <Button variant="secondary" disabled={currentPrivatePage === totalPrivatePages} onClick={() => setPrivatePage((page) => Math.min(totalPrivatePages, page + 1))}>Next</Button>
              <Button variant="secondary" disabled={currentPrivatePage === totalPrivatePages} onClick={() => setPrivatePage(totalPrivatePages)}>Last</Button>
            </div>
          </div>
        </div>
      )}
      {privateAlbums.length > 0 && (
        <div className="sticky bottom-4 z-40 mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-[1.5rem] border border-border bg-background/90 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text-primary">
            <span className="font-semibold">{selectedCount}</span> album{selectedCount === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={selectedCount === 0} onClick={() => openRequestModal("selected_albums")}>
              Request selected albums
            </Button>
            <Button variant="secondary" onClick={() => openRequestModal("all_private")}>
              Request all private albums
            </Button>
            <Button variant="ghost" disabled={selectedCount === 0} onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
