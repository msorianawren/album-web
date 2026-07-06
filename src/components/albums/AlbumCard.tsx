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
      className="group block rounded-[1.6rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-surface-secondary transition duration-300 ease-out group-hover:scale-[1.03]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {album.cover_url ? (
            <Image
              src={album.cover_url}
              alt={`${album.title} album cover`}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-300 ease-out group-hover:scale-[1.08]"
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
            <div className="absolute right-4 top-4 rounded-full bg-lightbox-control p-2 text-accent-foreground">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          {album.status === "updating" ? (
            <div className="absolute right-4 top-4 rounded-full bg-lightbox-control p-2 text-accent-foreground">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-text-primary">{album.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">
          {album.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
          <span>{album.media_count} media</span>
          <span>{formatMediaCount(album.photo_count, album.video_count)}</span>
        </div>
      </div>
    </Link>
  );
}
