import { AlbumList } from "@/components/albums/AlbumList";
import { AppHeader } from "@/components/AppHeader";
import { HomeHero } from "@/components/HomeHero";
import { UploadZone } from "@/components/upload/UploadZone";
import { getAlbums } from "@/lib/albums";

export default async function Home() {
  const albums = await getAlbums();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <HomeHero />
      <AlbumList albums={albums} />
      <UploadZone />
    </main>
  );
}
