import { getFeaturedAlbums } from "@/lib/albums";
import { HomeAlbumWorlds } from "@/components/landing/HomeAlbumWorlds";
import type { SiteSettings } from "@/lib/types";

export async function HomeAlbumWorldsWrapper({ settings }: { settings?: SiteSettings }) {
  const albums = await getFeaturedAlbums(4);
  return <HomeAlbumWorlds albums={albums} settings={settings} />;
}
