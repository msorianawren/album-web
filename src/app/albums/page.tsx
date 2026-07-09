import type { Metadata } from "next";
import { AlbumList } from "@/components/albums/AlbumList";
import { AppHeader } from "@/components/AppHeader";
import { getAlbums } from "@/lib/albums";
import { getLandingPage } from "@/lib/landing";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";

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

import { redirect } from "next/navigation";
import { getPublicSession } from "@/lib/auth";

import { AccessRequestModal } from "@/components/albums/AccessRequestModal";

import { cookies } from "next/headers";
import { getDictionary } from "@/lib/getDictionary";

export default async function AlbumsPage({ searchParams }: AlbumsPageProps) {
  const session = await getPublicSession();

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as "en" | "vi") || "en";
  const dict = await getDictionary(locale);

  const filters = await searchParams;
  const [albums, landing] = await Promise.all([
    getAlbums({ ...filters, session }),
    getLandingPage()
  ]);

  return (
    <main className="relative z-10 min-h-screen bg-transparent">
      <NatureAnimatedBackground config={landing.background_settings} />
      <AppHeader />
      <section className="page-shell-1440 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
          {dict.albums.archive_subtitle}
        </p>
        <h1 className="mt-3 max-w-4xl break-words text-4xl font-semibold leading-none text-text-primary sm:text-6xl">
          {dict.albums.archive_title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
          {dict.albums.archive_desc}
        </p>
      </section>
      <AlbumList albums={albums} dict={dict} locale={locale} />
      <AccessRequestModal />
    </main>
  );
}
