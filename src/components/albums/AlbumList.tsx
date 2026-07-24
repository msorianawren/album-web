import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
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
  const visibleStatuses = query.status ? [query.status] : orderedStatuses;
  const displayedAlbums = visibleStatuses.flatMap((status) => sections[status]?.albums ?? []);

  if (!displayedAlbums.length && !visibleStatuses.some((status) => sections[status]?.hasMore)) {
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
    <PrivateAlbumSelectionProvider>
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

          <form id="album-list-search" name="albumListSearch" action="/albums" className="flex w-full max-w-[500px] items-center gap-3 md:w-auto">
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
          const page = sections[status];
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
                  <AlbumPageSizeSelect defaultValue={query.limit} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                status={status}
                limit={query.limit}
                q={query.q}
                initialHasMore={page.hasMore}
                initialNextCursor={page.nextCursor}
              />
            </div>
          );
        })}

        <PrivateAlbumSelectionBar />
      </section>
    </PrivateAlbumSelectionProvider>
  );
}
