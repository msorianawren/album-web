import type { Metadata } from "next";
import { AlbumList } from "@/components/albums/AlbumList";
import { AppHeader } from "@/components/AppHeader";
import { getAlbums } from "@/lib/albums";

interface AlbumsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: "public" | "updating" | "private";
  }>;
}

export const metadata: Metadata = {
  title: "Albums",
  description: "Browse editorial albums, image galleries, downloads, likes, and comments.",
};

export default async function AlbumsPage({ searchParams }: AlbumsPageProps) {
  const filters = await searchParams;
  const albums = await getAlbums(filters);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="page-shell-1440 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
          Album archive
        </p>
        <h1 className="mt-3 max-w-4xl break-words text-4xl font-semibold leading-none text-text-primary sm:text-6xl">
          Editorial books, private collections, and moving image stories.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
          This is the dedicated album space for browsing visual collections, opening galleries,
          liking work, commenting, and downloading approved images.
        </p>
      </section>
      <AlbumList albums={albums} />
    </main>
  );
}
