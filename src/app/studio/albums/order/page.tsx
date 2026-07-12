import { AlbumOrderManager } from "@/components/studio/AlbumOrderManager";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioAlbums } from "@/lib/studio-data";

export default async function AlbumOrderPage() {
  const albums = await getStudioAlbums(500);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Display order"
        title="Album Ordering"
        description="Manually reorder public, updating, and private albums."
      />
      <AlbumOrderManager initialAlbums={albums} />
    </div>
  );
}
