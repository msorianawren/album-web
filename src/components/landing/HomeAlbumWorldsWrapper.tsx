import { getFeaturedAlbums } from "@/lib/albums";
import { HomeAlbumWorlds } from "@/components/landing/HomeAlbumWorlds";

export async function HomeAlbumWorldsWrapper() {
  const albums = await getFeaturedAlbums(4);
  return <HomeAlbumWorlds albums={albums} />;
}
