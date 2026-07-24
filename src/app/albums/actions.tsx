"use server";

import { getAlbumSections, type AlbumSections } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { PrivateAlbumCheckbox } from "@/components/albums/PrivateAlbumSelection";
import { getDictionary } from "@/lib/getDictionary";
import { cookies } from "next/headers";
import type { AlbumStatus } from "@/lib/types";

export async function loadMoreAlbumsAction(status: AlbumStatus, limit: number, cursor: string, q: string = "") {
  const session = await getPublicSession();
  const userClient = session.userId ? await createAuthenticatedUserClient() : null;

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as "en" | "vi") || "en";
  const dict = await getDictionary(locale);

  const sections = await getAlbumSections({
    q,
    status,
    limit,
    cursors: { [status]: cursor },
    session,
    userClient,
  });

  const page = sections[status];
  if (!page) return { albums: [], nextCursor: undefined, hasMore: false };

  const accessResolvedStatuses = new Set([
    "approved",
    "pending",
    "revoked",
    "rejected",
    "denied",
    "needs_manual_review",
  ]);

  const renderedAlbums = page.albums.map((album) => {
    const isPrivate = status === "private";
    const isSelectable = isPrivate && !accessResolvedStatuses.has(album.access_request_status ?? "");

    return (
      <div key={album.id} className="relative">
        <AlbumCard album={album} dict={dict} locale={locale} priority={false} />
        {isSelectable && (
          <PrivateAlbumCheckbox album={{ id: album.id, slug: album.slug, title: album.title }} />
        )}
      </div>
    );
  });

  return {
    albums: renderedAlbums,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}
