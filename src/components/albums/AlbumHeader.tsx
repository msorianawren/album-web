import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import { ShareButton } from "@/components/ui/ShareButton";
import type { AlbumDetail } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";

interface AlbumHeaderProps {
  album: AlbumDetail;
}

export function AlbumHeader({ album }: AlbumHeaderProps) {
  return (
    <section className="page-shell-1440 grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] border border-border bg-surface/70 shadow-2xl shadow-text-primary/10 sm:rounded-[2.4rem] lg:aspect-[5/4]">
        {album.cover_url ? (
          <Image
            src={album.cover_url}
            alt={`${album.title} cover`}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-text-secondary" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 pb-3 animate-editorial-in">
        <div className="flex flex-wrap items-center gap-3">
          <AlbumStatusBadge status={album.status} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            {formatMediaCount(album.photo_count, album.video_count)}
          </p>
        </div>
        <h1 className="mt-5 break-words text-[2.7rem] font-semibold leading-[1] text-text-primary sm:text-7xl">
          {album.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
          {album.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ShareButton title={album.title} />
          {album.download_allowed ? (
            <DownloadButton href={`/api/albums/${album.id}/download`} label="Download album" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
