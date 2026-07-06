import { Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AlbumDetail } from "@/lib/types";
import { formatPhotoCount } from "@/lib/utils";

interface AlbumHeaderProps {
  album: AlbumDetail;
}

export function AlbumHeader({ album }: AlbumHeaderProps) {
  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          {album.is_public ? "Public album" : "Private album"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal text-text-primary sm:text-5xl">
          {album.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          {album.description}
        </p>
        <p className="mt-3 text-sm font-medium text-text-secondary">
          {formatPhotoCount(album.photo_count)}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </Button>
        <Button>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload
        </Button>
      </div>
    </section>
  );
}
