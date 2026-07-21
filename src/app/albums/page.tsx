import type { Metadata } from "next";
import { AlbumList } from "@/components/albums/AlbumList";
import { AppHeader } from "@/components/AppHeader";
import { getAlbumSections } from "@/lib/albums";
import { getLandingPage } from "@/lib/landing";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";

interface AlbumsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: "public" | "updating" | "private";
    limit?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Albums",
  description: "Browse editorial albums, image galleries, downloads, likes, and comments.",
};

import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";

import { AccessRequestModal } from "@/components/albums/AccessRequestModal";

import { cookies } from "next/headers";
import { getDictionary } from "@/lib/getDictionary";
import { albumPageQuerySchema } from "@/lib/validators";

export default async function AlbumsPage({ searchParams }: AlbumsPageProps) {
  const session = await getPublicSession();
  const userClient = session.userId ? await createAuthenticatedUserClient() : null;

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as "en" | "vi") || "en";
  const dict = await getDictionary(locale);

  const filters = await searchParams;
  const parsedFilters = albumPageQuerySchema.safeParse(filters);
  const browseQuery = parsedFilters.success
    ? parsedFilters.data
    : { q: "", status: undefined, limit: 24 };
  const [sections, landing] = await Promise.all([
    getAlbumSections({
      q: browseQuery.q,
      status: browseQuery.status,
      limit: browseQuery.limit,
      session,
      userClient,
    }),
    getLandingPage()
  ]);

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="relative z-10 min-h-screen bg-transparent">
        <AppHeader />
      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:py-32">
        <div className="max-w-4xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-text-secondary mb-4">
            {dict.albums.archive_subtitle}
          </p>
          <h1 className="font-serif text-[3.2rem] md:text-7xl font-light leading-[0.95] text-text-primary mb-8">
            {dict.albums.archive_title}
          </h1>
          <p className="max-w-2xl text-[1.1rem] leading-[1.8] font-light text-text-secondary">
            {dict.albums.archive_desc}
          </p>
        </div>
      </section>
      <AlbumList
        key={`${browseQuery.q}|${browseQuery.status ?? "all"}|${browseQuery.limit}`}
        sections={sections}
        query={{ q: browseQuery.q, status: browseQuery.status, limit: browseQuery.limit }}
        dict={dict}
        locale={locale}
      />
        <AccessRequestModal />
      </main>
    </>
  );
}
