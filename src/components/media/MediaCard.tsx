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
  
  const hasNote = media.title || media.description;
  const rotations = ["-rotate-[1deg]", "rotate-[1deg]", "-rotate-[1.5deg]", "rotate-[0.5deg]", "rotate-[1.5deg]", "-rotate-[0.5deg]"];
  const rotationClass = rotations[index % rotations.length];

  return (
    <div
      className={`group relative mb-8 block w-full break-inside-avoid rounded-[2px] border border-border/40 bg-surface p-3 pb-5 shadow-lg transition-all duration-300 hover:z-10 hover:shadow-xl sm:p-4 sm:pb-6 ${rotationClass}`}
      onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
    >
      {/* Semi-transparent Tape Decoration */}
      <div className="absolute -top-3 left-1/2 z-20 h-6 w-16 -translate-x-1/2 rotate-[-4deg] bg-text-primary/10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-sm" />

      <button
        className="relative block w-full overflow-hidden rounded-[2px] bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ aspectRatio }}
        onClick={() => onOpen(index)}
        aria-label={`Open ${media.title ?? media.original_filename ?? "media"}`}
      >
        {media.media_type === "image" ? (
          <Image
            src={previewUrl}
            alt={media.title ?? media.original_filename ?? "Album image"}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
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
                className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                draggable={!protectAssets}
              />
            ) : (
              <div className="h-full w-full bg-surface" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Play className="ml-1 h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </>
        )}
      </button>

      {/* Note Label */}
      {hasNote && (
        <div className="mt-4 px-2 font-serif text-sm italic tracking-wide text-text-secondary/90 text-center">
          {media.title || media.description}
        </div>
      )}

      {/* Controls Overlay */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-start justify-end p-2 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface/80 p-1.5 shadow-md backdrop-blur-md">
          <MediaLikeButton mediaId={media.id} compact />
          {downloadAllowed ? (
            <DownloadButton href={`/api/media/${media.id}/download`} compact />
          ) : null}
        </div>
      </div>
    </div>
  );
}
