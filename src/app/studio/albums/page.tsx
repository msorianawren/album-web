import { AlbumsManager } from "@/components/studio/AlbumsManager";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioAlbums } from "@/lib/studio-data";

export default async function StudioAlbumsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const albums = await getStudioAlbums(300);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Album management"
        title="Albums"
        description="Search, filter, publish, lock, edit, and delete albums from one production-safe list."
      />
      <AlbumsManager initialAlbums={albums} initialSearch={params.q ?? ""} />
    </div>
  );
}
