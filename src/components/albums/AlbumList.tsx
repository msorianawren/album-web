"use client";

import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import type { AlbumStatus } from "@/lib/types";
import type { AlbumSections } from "@/lib/albums";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { AppDictionary } from "@/lib/i18n";
import {
  PrivateAlbumSelectionProvider,
  PrivateAlbumCheckbox,
  PrivateAlbumSelectionBar,
} from "@/components/albums/PrivateAlbumSelection";
import { AlbumPagination } from "@/components/albums/AlbumPagination";
import { AlbumPageSizeSelect } from "@/components/albums/AlbumPageSizeSelect";
import { AlbumColsSelect } from "@/components/albums/AlbumColsSelect";

interface AlbumListProps {
  sections: AlbumSections;
  query: {
    status?: AlbumStatus;
    limit: number;
    cols: number;
    page: number;
  };
  dict?: AppDictionary;
  locale?: string;
}

const orderedStatuses: AlbumStatus[] = ["public", "updating", "private"];
const accessResolvedStatuses = new Set([
  "approved",
  "pending",
  "revoked",
  "rejected",
  "denied",
  "needs_manual_review",
]);

function sectionCopy(status: AlbumStatus, dict?: AppDictionary) {
  if (status === "private") {
    return {
      eyebrow: "Restricted Access",
      title: dict?.albums?.private_albums || "Private Archives",
      description: dict?.albums?.private_albums_desc || "Select the private albums you want, then submit one access request for review.",
    };
  }

  if (status === "updating") {
    return {
      eyebrow: "Work In Progress",
      title: dict?.albums?.status_updating || "Updating Archives",
      description: "Ongoing editorials and collections that are still taking shape.",
    };
  }

  return {
    eyebrow: "Selected Books",
    title: dict?.albums?.public_albums || "Public Archives",
    description: dict?.albums?.public_albums_desc || "Browse public editorials and featured visual works.",
  };
}

function getGridColsClass(cols: number): string {
  switch (cols) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-2 sm:grid-cols-3";
    case 4:
      return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    case 5:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    case 6:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
    case 7:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7";
    case 8:
      return "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8";
    case 9:
      return "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9";
    case 10:
      return "grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10";
    default:
      return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
  }
}

export function AlbumList({ sections, query, dict, locale = "en" }: AlbumListProps) {
  const [cols, setCols] = useState<number>(query.cols || 5);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_album_cols");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 1 && parsed <= 10) {
          setCols(parsed);
        }
      }
    } catch {}
  }, []);

  const handleColsChange = (newCols: number) => {
    setCols(newCols);
    try {
      localStorage.setItem("preferred_album_cols", String(newCols));
      const url = new URL(window.location.href);
      url.searchParams.set("cols", String(newCols));
      window.history.replaceState(null, "", url.toString());
    } catch {}
  };

  const visibleStatuses = query.status ? [query.status] : orderedStatuses;
  const displayedAlbums = visibleStatuses.flatMap((status) => sections[status]?.albums ?? []);

  if (!displayedAlbums.length && !visibleStatuses.some((status) => sections[status]?.hasMore)) {
    return (
      <section className="mx-auto flex w-full max-w-[1480px] flex-col items-center px-6 py-32 text-center">
        <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full border border-border/40 bg-surface/30 text-text-secondary/30">
          <Camera className="h-10 w-10" aria-hidden="true" />
        </div>
        <h2 className="mb-6 font-serif text-3xl font-normal text-text-primary md:text-4xl">
          {dict?.albums?.no_albums || "No Archives Available"}
        </h2>
        <p className="max-w-[400px] text-[0.95rem] font-light leading-[1.8] text-text-secondary">
          {dict?.albums?.no_albums_desc || "Public collections will appear here when the owner publishes them."}
        </p>
      </section>
    );
  }

  return (
    <PrivateAlbumSelectionProvider>
      <section id="albums" className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8 pb-24">
        <ScrollReveal className="mb-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="min-w-0 max-w-xl">
            <p className="mb-3 block text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">Selected Books</p>
            <h2 className="mb-4 font-serif text-[2.2rem] font-light leading-none text-text-primary md:text-5xl">
              {dict?.albums?.public_albums || "Public Archives"}
            </h2>
            <p className="max-w-[420px] text-[0.95rem] font-light leading-[1.6] text-text-secondary">
              {dict?.albums?.public_albums_desc || "Browse public editorials, updating diaries, and featured visual works."}
            </p>
          </div>

          <form action="/albums" className="flex items-center gap-3">
            <input type="hidden" name="limit" value={query.limit} />
            <select
              name="status"
              className="h-11 shrink-0 appearance-none rounded-full border border-border/40 bg-surface/20 px-4 text-[0.8rem] text-text-secondary outline-none transition focus:border-text-primary/30"
              defaultValue={query.status ?? ""}
            >
              <option value="">{dict?.albums?.all_statuses || "All"}</option>
              <option value="public">{dict?.albums?.status_public || "Public"}</option>
              <option value="updating">{dict?.albums?.status_updating || "Updating"}</option>
              <option value="private">{dict?.albums?.status_private || "Private"}</option>
            </select>
            <button type="submit" className="h-11 border-b border-text-primary px-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors hover:border-accent hover:text-accent">
              Apply
            </button>
          </form>
        </ScrollReveal>

        {visibleStatuses.map((status) => {
          const page = sections[status];
          if (!page || (!page.albums.length && !page.hasMore)) return null;
          const copy = sectionCopy(status, dict);
          const isPrivate = status === "private";

          return (
            <div key={status} className="mb-16 border-t border-border/40 pt-10 last:mb-0">
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">{copy.eyebrow}</p>
                  <h2 className="mb-3 font-serif text-[1.8rem] font-light leading-none text-text-primary md:text-4xl">{copy.title}</h2>
                  <p className="max-w-[520px] text-[0.92rem] font-light leading-[1.6] text-text-secondary">{copy.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  <span>{page.albums.length} loaded</span>
                  <AlbumColsSelect value={cols} onChange={handleColsChange} />
                  <AlbumPageSizeSelect defaultValue={query.limit} />
                </div>
              </div>

              <div className={`grid gap-3 sm:gap-3.5 md:gap-4 lg:gap-5 ${getGridColsClass(cols)}`}>
                {page.albums.map((album, index) => {
                  const isSelectable = isPrivate && !accessResolvedStatuses.has(album.access_request_status ?? "");
                  const isLcpCandidate = index === 0 && status === visibleStatuses[0];
                  
                  return (
                    <div key={album.id} className="relative">
                      <AlbumCard album={album} dict={dict} locale={locale} priority={isLcpCandidate} />
                      {isSelectable ? (
                        <PrivateAlbumCheckbox album={{ id: album.id, slug: album.slug, title: album.title }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <AlbumPagination
                limit={query.limit}
                currentPage={query.page}
                totalCount={page.totalCount}
              />
            </div>
          );
        })}

        <PrivateAlbumSelectionBar />
      </section>
    </PrivateAlbumSelectionProvider>
  );
}
