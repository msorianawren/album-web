import { notFound } from "next/navigation";
import { AlbumEditor } from "@/components/studio/AlbumEditor";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getAlbum } from "@/lib/albums";
import { getSiteSettings } from "@/lib/site-settings";

export default async function StudioAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id, { isAdmin: true });
  if (!album) notFound();
  
  const settings = await getSiteSettings();

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Album editor"
        title={album.title}
        description="Edit album metadata, visibility, cover, and media without leaving Studio."
      />
      <AlbumEditor album={album} settings={settings} />
    </div>
  );
}
