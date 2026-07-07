import { AlbumList } from "@/components/albums/AlbumList";
import { AppHeader } from "@/components/AppHeader";
import { HomeHero } from "@/components/HomeHero";
import { getAlbums } from "@/lib/albums";
import { getLandingPage } from "@/lib/landing";

interface HomeProps {
  searchParams: Promise<{
    q?: string;
    status?: "public" | "updating" | "private";
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const filters = await searchParams;
  const [albums, landing] = await Promise.all([
    getAlbums(filters),
    getLandingPage(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <HomeHero landing={landing} />
      <AlbumList albums={albums} />
    </main>
  );
}
