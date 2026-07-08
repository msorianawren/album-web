import Image from "next/image";
import { Play } from "lucide-react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import type { Media } from "@/lib/types";

interface MediaCardProps {
  media: Media;
  index: number;
  downloadAllowed: boolean;
  protectAssets?: boolean;
  onOpen: (index: number) => void;
}

export function MediaCard({
  media,
  index,
  downloadAllowed,
  protectAssets = false,
  onOpen,
}: MediaCardProps) {
  const aspectRatio =
    media.width && media.height ? `${media.width} / ${media.height}` : "4 / 3";
  const previewUrl = media.thumbnail_url ?? media.poster_url ?? media.medium_url ?? media.url;

  return (
    <div
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-3xl bg-surface-secondary text-left"
      style={{ aspectRatio }}
      onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
    >
      <button
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(index)}
        aria-label={`Open ${media.title ?? media.original_filename ?? "media"}`}
      >
        {media.media_type === "image" ? (
          <Image
            src={previewUrl}
            alt={media.title ?? media.original_filename ?? "Album image"}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
            draggable={!protectAssets}
          />
        ) : (
          <>
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={media.title ?? "Video poster"}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
                draggable={!protectAssets}
              />
            ) : (
              <div className="h-full w-full bg-surface" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lightbox-control text-accent-foreground">
                <Play className="ml-1 h-6 w-6" aria-hidden="true" />
              </span>
            </div>
          </>
        )}
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-overlay p-3 opacity-0 transition duration-250 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-auto flex items-center gap-2">
          <MediaLikeButton mediaId={media.id} compact />
          {downloadAllowed ? (
            <DownloadButton href={`/api/media/${media.id}/download`} compact />
          ) : null}
        </div>
      </div>
    </div>
  );
}
