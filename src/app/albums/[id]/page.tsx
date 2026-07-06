import { notFound } from "next/navigation";
import { AlbumHeader } from "@/components/albums/AlbumHeader";
import { AppHeader } from "@/components/AppHeader";
import { MasonryGrid } from "@/components/gallery/MasonryGrid";
import { UploadZone } from "@/components/upload/UploadZone";
import { getAlbum } from "@/lib/albums";

interface AlbumPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const album = await getAlbum(id);

  if (!album) notFound();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <AlbumHeader album={album} />
      <MasonryGrid images={album.images} />
      <UploadZone />
    </main>
  );
}
