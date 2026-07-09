import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlbumHeader } from "@/components/albums/AlbumHeader";
import { AlbumDownloadButton } from "@/components/albums/AlbumDownloadButton";
import { LockedAlbumState } from "@/components/albums/LockedAlbumState";
import { UpdatingNotice } from "@/components/albums/UpdatingNotice";
import { AppHeader } from "@/components/AppHeader";
import { CommentSection } from "@/components/comments/CommentSection";
import { LikeButton } from "@/components/media/LikeButton";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getAlbum } from "@/lib/albums";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicSession } from "@/lib/auth";

interface AlbumPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { id } = await params;
  const album = await getAlbum(id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  if (!album) {
    return {
      title: "Album not found",
    };
  }

  if (album.locked) {
    return {
      title: "Private album",
      description: "This album is private. Please contact the owner for access.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${album.title} | Oriana Wren`;
  const description =
    album.description ?? `${album.photo_count} photos and ${album.video_count} videos.`;
  const url = siteUrl ? `${siteUrl}/albums/${album.slug}` : undefined;
  const images = album.cover_url ? [{ url: album.cover_url, alt: album.title }] : undefined;

  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images,
    },
    twitter: {
      card: album.cover_url ? "summary_large_image" : "summary",
      title,
      description,
      images: album.cover_url ? [album.cover_url] : undefined,
    },
  };
}

import { AccessRequestModal } from "@/components/albums/AccessRequestModal";

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const [album, settings] = await Promise.all([getAlbum(id), getSiteSettings()]);

  if (!album) notFound();

  const session = await getPublicSession();
  if (!session?.userId) {
    redirect(`/login?redirect=/albums/${album.slug}`);
  }

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
          <MediaGrid
            albumId={album.id}
            media={album.media}
            downloadAllowed={album.download_allowed}
            protectAssets={settings.disable_public_right_click}
            defaultSortMode={album.default_media_sort}
          />
          <AlbumDownloadButton
            albumId={album.id}
            disabled={
              !settings.allow_public_downloads ||
              !album.download_allowed ||
              !album.media.some((item) => item.media_type === "image" && item.download_allowed !== false)
            }
          />
          <CommentSection albumId={album.id} />
        </>
      )}
      <AccessRequestModal />
    </main>
  );
}
