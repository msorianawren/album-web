import Image from "next/image";
import Link from "next/link";
import { Heart, Lock, MessageCircle, RefreshCw } from "lucide-react";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import type { Album } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const previewItems = album.preview_items ?? [];
  const previewImages = [
    ...previewItems
      .filter((item) => item.media_type === "image")
      .map((item) => item.thumbnail_url ?? item.medium_url ?? item.url)
      .filter(Boolean),
    album.cover_url,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).slice(0, 4);
  const videoPreview = previewItems.find((item) => item.media_type === "video");

  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group block min-w-0 rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="overflow-hidden rounded-[1.8rem] border border-border bg-surface/75 p-2 shadow-lg shadow-text-primary/5 transition duration-500 ease-out group-hover:-translate-y-1 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-text-primary/10">
        <div className="living-preview-frame relative aspect-[3/4] overflow-hidden rounded-[1.45rem] bg-surface-secondary">
          {previewImages.length ? (
            previewImages.map((src, index) => (
              <Image
                key={`${src}-${index}`}
                src={src}
                alt={index === 0 ? `${album.title} animated album preview` : ""}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="living-preview-image object-cover"
                style={{
                  animationDelay: `${index * 3.2}s`,
                  opacity: index === 0 ? 1 : undefined,
                }}
              />
            ))
          ) : (
            <div className="living-preview-placeholder flex h-full w-full items-center justify-center bg-surface">
              <Lock className="h-8 w-8 text-text-secondary" aria-hidden="true" />
            </div>
          )}
          <div className="living-preview-light" aria-hidden="true" />
          <div className="absolute left-4 top-4">
            <AlbumStatusBadge status={album.status} />
          </div>
          {videoPreview ? (
            <div className="absolute bottom-4 left-4 rounded-full border border-lightbox-border bg-lightbox-control px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent-foreground backdrop-blur">
              Motion
            </div>
          ) : null}
          {album.status === "private" ? (
            <div className="absolute right-4 top-4 rounded-full border border-lightbox-border bg-lightbox-control p-2 text-accent-foreground backdrop-blur">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          {album.status === "updating" ? (
            <div className="absolute right-4 top-4 rounded-full border border-lightbox-border bg-lightbox-control p-2 text-accent-foreground backdrop-blur">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-xs font-semibold uppercase text-white/75">
              Open collection
            </p>
            <p className="mt-1 text-sm leading-6 text-white">
              {album.media_count} curated work{album.media_count === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 px-1">
        <h3 className="break-words text-xl font-semibold text-text-primary">
          {album.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
          {album.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">
          <span>{album.media_count} works</span>
          <span>{formatMediaCount(album.photo_count, album.video_count)}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" aria-hidden="true" />
            {album.like_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" aria-hidden="true" />
            {album.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
