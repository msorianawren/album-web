import Image from "next/image";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import type { Album } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="overflow-hidden rounded-[1.8rem] border border-border bg-surface/70 p-2 transition duration-500 ease-out group-hover:-translate-y-1 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-text-primary/10">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[1.45rem]">
          {album.cover_url ? (
            <Image
              src={album.cover_url}
              alt={`${album.title} album cover`}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface">
              <Lock className="h-8 w-8 text-text-secondary" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-4 top-4">
            <AlbumStatusBadge status={album.status} />
          </div>
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
        </div>
      </div>
      <div className="mt-5 px-1">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
          {album.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
          {album.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">
          <span>{album.media_count} works</span>
          <span>{formatMediaCount(album.photo_count, album.video_count)}</span>
        </div>
      </div>
    </Link>
  );
}
