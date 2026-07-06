import { Download, Share2 } from "lucide-react";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AlbumDetail } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";

interface AlbumHeaderProps {
  album: AlbumDetail;
}

export function AlbumHeader({ album }: AlbumHeaderProps) {
  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <AlbumStatusBadge status={album.status} />
          <p className="text-sm font-medium text-text-secondary">
            {formatMediaCount(album.photo_count, album.video_count)}
          </p>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-text-primary sm:text-5xl">
          {album.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          {album.description}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </Button>
        {album.download_allowed ? (
          <Button>
            <Download className="h-4 w-4" aria-hidden="true" />
            Downloads enabled
          </Button>
        ) : null}
      </div>
    </section>
  );
}
