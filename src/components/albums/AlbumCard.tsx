import Image from "next/image";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import type { Album } from "@/lib/types";
import { formatPhotoCount } from "@/lib/utils";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group block rounded-[1.6rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-surface-secondary transition duration-300 ease-out group-hover:scale-[1.03]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {album.cover_image ? (
            <Image
              src={album.cover_image}
              alt={`${album.title} album cover`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-300 ease-out group-hover:scale-[1.08]"
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {album.title}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {formatPhotoCount(album.photo_count)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
          {album.is_public ? (
            <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {album.is_public ? "Public" : "Private"}
        </span>
      </div>
    </Link>
  );
}
