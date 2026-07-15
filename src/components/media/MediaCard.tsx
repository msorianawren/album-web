import { Clock3, Play, TriangleAlert } from "lucide-react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { MediaLikeButton } from "@/components/media/MediaLikeButton";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { AlbumStatus, Media } from "@/lib/types";

interface MediaCardProps {
  media: Media;
  index: number;
  downloadAllowed: boolean;
  albumStatus: AlbumStatus;
  protectAssets?: boolean;
  onOpen: (index: number) => void;
}

export function MediaCard({
  media,
  index,
  downloadAllowed,
  albumStatus,
  protectAssets = false,
  onOpen,
}: MediaCardProps) {
  const delivery = getMediaDeliveryDescriptor(media, {
    albumStatus,
    isAuthorized: true,
    downloadAllowed,
  });
  const aspectRatio = `${delivery.width} / ${delivery.height}`;
  const isProcessing = delivery.processingState === "pending";
  const isPermanentlyFailed = ["failed", "rejected"].includes(delivery.processingState);
  const isUnavailable = isProcessing || isPermanentlyFailed;

  const fallback = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-secondary px-6 text-center">
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">
        Image unavailable
      </span>
      <span className="text-sm text-text-secondary/70">This media could not be loaded.</span>
    </div>
  );

  return (
    <div
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-3xl bg-surface-secondary text-left"
      style={{ aspectRatio }}
      onContextMenu={protectAssets ? (event) => event.preventDefault() : undefined}
    >
      <button
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(index)}
        disabled={isUnavailable}
        data-media-index={index}
        aria-label={
          isProcessing
            ? "Media is still processing"
            : isPermanentlyFailed
              ? "Media processing failed"
              : `Open ${media.title ?? media.original_filename ?? "media"}`
        }
      >
        {isUnavailable ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-secondary px-6 text-center">
            {isProcessing ? (
              <Clock3 className="h-7 w-7 text-text-secondary" aria-hidden="true" />
            ) : (
              <TriangleAlert className="h-7 w-7 text-text-secondary" aria-hidden="true" />
            )}
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-text-secondary">
              {isProcessing ? "Media processing" : "Media unavailable"}
            </span>
            <span className="max-w-48 text-sm leading-6 text-text-secondary/70">
              {isProcessing
                ? "This item will appear after secure processing finishes."
                : "Processing failed. An administrator can review or retry this item."}
            </span>
          </div>
        ) : media.media_type === "image" ? (
          <ReliableMediaImage
            target={delivery.card}
            alt={delivery.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
            draggable={!protectAssets}
            fallback={fallback}
          />
        ) : (
          <>
            <ReliableMediaImage
              target={delivery.card}
              alt={delivery.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
              draggable={!protectAssets}
              fallback={fallback}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Play className="ml-1 h-6 w-6" aria-hidden="true" />
              </span>
            </div>
          </>
        )}
      </button>

      {!isUnavailable ? <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-overlay p-3 opacity-0 transition duration-250 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="pointer-events-auto flex items-center gap-2">
          <MediaLikeButton mediaId={media.id} compact />
          {downloadAllowed ? (
            <DownloadButton href={delivery.downloadHref ?? `/api/media/${media.id}/download`} compact />
          ) : null}
        </div>
      </div> : null}
    </div>
  );
}
