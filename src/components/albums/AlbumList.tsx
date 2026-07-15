"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckSquare, LoaderCircle, Square } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import type { Album, AlbumStatus } from "@/lib/types";
import type { AlbumPage, AlbumSections } from "@/lib/albums";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { AppDictionary } from "@/lib/i18n";

interface AlbumListProps {
  sections: AlbumSections;
  query: {
    q: string;
    status?: AlbumStatus;
    limit: number;
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

function isAlbumPage(value: unknown): value is AlbumPage {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as AlbumPage).albums) &&
    typeof (value as AlbumPage).status === "string",
  );
}

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

export function AlbumList({ sections, query, dict, locale = "en" }: AlbumListProps) {
  const router = useRouter();
  const [pages, setPages] = useState<AlbumSections>(sections);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loadingStatus, setLoadingStatus] = useState<AlbumStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const visibleStatuses = query.status ? [query.status] : orderedStatuses;
  const displayedAlbums = useMemo(
    () => (query.status ? [query.status] : orderedStatuses).flatMap((status) => pages[status]?.albums ?? []),
    [pages, query.status],
  );
  const privateAlbums = useMemo(() => pages.private?.albums ?? [], [pages.private]);
  const selectablePrivateAlbums = useMemo(
    () => privateAlbums.filter((album) => !accessResolvedStatuses.has(album.access_request_status ?? "")),
    [privateAlbums],
  );
  const selectedAlbums = useMemo(
    () => selectablePrivateAlbums.filter((album) => selectedIds.has(album.id)),
    [selectablePrivateAlbums, selectedIds],
  );

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
    const detail = scope === "all_private"
      ? { scope, albums: [] }
      : {
          scope,
          albums: selectedAlbums.map((album) => ({ id: album.id, title: album.title, slug: album.slug })),
        };
    document.dispatchEvent(new CustomEvent("open-access-request", { detail }));
  };

  const changePageSize = (limit: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    params.set("limit", String(limit));
    router.push(`/albums?${params.toString()}`);
  };

  const loadMore = async (status: AlbumStatus) => {
    const current = pages[status];
    if (!current?.nextCursor || loadingStatus) return;

    setLoadingStatus(status);
    setLoadError(null);
    const params = new URLSearchParams({
      status,
      limit: String(query.limit),
      cursor: current.nextCursor,
    });
    if (query.q) params.set("q", query.q);

    try {
      const response = await fetch(`/api/albums?${params.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      const nextPage = (
        payload &&
        typeof payload === "object" &&
        "data" in payload &&
        (payload as { data?: { page?: unknown } }).data?.page
      );

      if (!response.ok || !isAlbumPage(nextPage)) {
        throw new Error("Album page request failed.");
      }

      setPages((currentPages) => {
        const existing = currentPages[status];
        if (!existing) return currentPages;
        const existingIds = new Set(existing.albums.map((album) => album.id));
        return {
          ...currentPages,
          [status]: {
            ...nextPage,
            albums: [...existing.albums, ...nextPage.albums.filter((album) => !existingIds.has(album.id))],
          },
        };
      });
    } catch {
      setLoadError("More albums could not be loaded. Please try again.");
    } finally {
      setLoadingStatus(null);
    }
  };

  if (!displayedAlbums.length && !visibleStatuses.some((status) => pages[status]?.hasMore)) {
    return (
      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 py-32 text-center">
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
    <section id="albums" className="mx-auto w-full max-w-[1200px] px-6 pb-32">
      <ScrollReveal className="mb-12 flex flex-col justify-between gap-10 md:flex-row md:items-end">
        <div className="min-w-0 max-w-xl">
          <p className="mb-4 block text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">Selected Books</p>
          <h2 className="mb-6 font-serif text-[2.2rem] font-light leading-none text-text-primary md:text-5xl">
            {dict?.albums?.public_albums || "Public Archives"}
          </h2>
          <p className="max-w-[420px] text-[1rem] font-light leading-[1.6] text-text-secondary">
            {dict?.albums?.public_albums_desc || "Browse public editorials, updating diaries, and featured visual works."}
          </p>
        </div>

        <form action="/albums" className="flex w-full max-w-[500px] items-center gap-3 md:w-auto">
          <input type="hidden" name="limit" value={query.limit} />
          <input
            name="q"
            defaultValue={query.q}
            placeholder={dict?.albums?.search_placeholder || "Search archives..."}
            className="h-11 w-full rounded-full border border-border/40 bg-surface/20 px-5 text-[0.8rem] text-text-primary outline-none transition placeholder:text-text-secondary/50 focus:border-text-primary/30"
          />
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
          <Button type="submit" variant="secondary" className="h-11 px-5 text-[0.7rem] uppercase tracking-widest">
            {dict?.common?.search || "Find"}
          </Button>
        </form>
      </ScrollReveal>

      {visibleStatuses.map((status) => {
        const page = pages[status];
        if (!page || (!page.albums.length && !page.hasMore)) return null;
        const copy = sectionCopy(status, dict);
        const isPrivate = status === "private";

        return (
          <div key={status} className="mb-24 border-t border-border/40 pt-16 last:mb-0">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-4 block text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">{copy.eyebrow}</p>
                <h2 className="mb-6 font-serif text-[2.2rem] font-light leading-none text-text-primary md:text-5xl">{copy.title}</h2>
                <p className="max-w-[520px] text-[1rem] font-light leading-[1.6] text-text-secondary">{copy.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>{page.albums.length} loaded</span>
                <select
                  value={query.limit}
                  onChange={(event) => changePageSize(Number(event.target.value))}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none"
                  aria-label="Albums per batch"
                >
                  {[12, 24, 48, 96].map((size) => (
                    <option key={size} value={size}>{size} per batch</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {page.albums.map((album) => {
                const isSelectable = isPrivate && selectablePrivateAlbums.some((item) => item.id === album.id);
                const isSelected = selectedIds.has(album.id);
                return (
                  <div key={album.id} className="relative">
                    <AlbumCard album={album} dict={dict} locale={locale} />
                    {isPrivate ? (
                      <button
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => toggleSelected(album)}
                        className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-text-primary shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={isSelected ? "Remove album from request" : "Select album for private access request"}
                      >
                        {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {page.hasMore ? (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={loadingStatus !== null}
                  onClick={() => loadMore(status)}
                  className="min-w-44"
                >
                  {loadingStatus === status ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {loadingStatus === status ? "Loading" : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}

      {loadError ? <p className="mt-6 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p> : null}

      {pages.private ? (
        <div className="sticky bottom-4 z-40 mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-[1.5rem] border border-border bg-background/90 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text-primary">
            <span className="font-semibold">{selectedAlbums.length}</span> album{selectedAlbums.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={selectedAlbums.length === 0} onClick={() => openRequestModal("selected_albums")}>Request selected albums</Button>
            <Button variant="secondary" onClick={() => openRequestModal("all_private")}>Request all private albums</Button>
            <Button variant="ghost" disabled={selectedAlbums.length === 0} onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
