import { notFound } from "next/navigation";
import { AlbumHeader } from "@/components/albums/AlbumHeader";
import { AlbumDownloadButton } from "@/components/albums/AlbumDownloadButton";
import { LockedAlbumState } from "@/components/albums/LockedAlbumState";
import { UpdatingNotice } from "@/components/albums/UpdatingNotice";
import { AppHeader } from "@/components/AppHeader";
import { CommentSection } from "@/components/comments/CommentSection";
import { LikeButton } from "@/components/media/LikeButton";
import { MediaGrid } from "@/components/media/MediaGrid";
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
      {album.locked ? (
        <LockedAlbumState album={album} />
      ) : (
        <>
          {album.status === "updating" ? <UpdatingNotice /> : null}
          <section className="mx-auto flex w-full max-w-[1440px] justify-end px-4 pb-6 sm:px-8 lg:px-12">
            <LikeButton albumId={album.id} />
          </section>
          <MediaGrid media={album.media} downloadAllowed={album.download_allowed} />
          <AlbumDownloadButton
            albumId={album.id}
            disabled={!album.download_allowed || !album.media.some((item) => item.media_type === "image")}
          />
          <CommentSection albumId={album.id} />
        </>
      )}
    </main>
  );
}
