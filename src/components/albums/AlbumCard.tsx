import Link from "next/link";
import { Feather, Lock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Album } from "@/lib/types";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { AlbumViewBadge } from "@/components/albums/AlbumViewBadge";
import { AlbumAccessRequestButton } from "@/components/albums/AlbumAccessRequestButton";
import {
  createMediaDeliveryTarget,
  getMediaDeliveryDescriptor,
  type MediaDeliveryTarget,
} from "@/lib/media/delivery";
import type { AppDictionary } from "@/lib/i18n";
import { DEFAULT_PRIVATE_ALBUM_FEATHER_PRICE, getEffectiveFeatherPrice } from "@/lib/wren-feathers";

interface AlbumCardProps {
  album: Album;
  dict?: AppDictionary;
  locale?: string;
  priority?: boolean;
}

export function AlbumCard({ album, dict, locale = "en", priority = false }: AlbumCardProps) {
  const previewItems = album.preview_items ?? [];
  const hasAuthorizedPrivatePreviews = album.status === "private" && previewItems.length > 0;
  
  // Get the best single cover image target
  const preferredItem = previewItems.find((item) => item.id === album.cover_media_id)
    ?? previewItems.find((item) => item.media_type === "image")
    ?? previewItems[0];

  const coverTarget: MediaDeliveryTarget = album.status === "private"
    ? hasAuthorizedPrivatePreviews && preferredItem
      ? getMediaDeliveryDescriptor(preferredItem, {
          albumStatus: "private",
          isAuthorized: true,
        }).card
      : createMediaDeliveryTarget(album.safe_preview_url || album.cover_url, "safe-preview")
    : preferredItem
      ? getMediaDeliveryDescriptor(preferredItem, { albumStatus: album.status }).card
      : createMediaDeliveryTarget(album.cover_url);

  const videoPreview = (album.status !== "private" || hasAuthorizedPrivatePreviews)
    ? previewItems.find((item) => item.media_type === "video")
    : null;

  const canPurchaseWithFeathers = album.status === "private"
    && album.feather_purchase_enabled !== false
    && album.access_request_status !== "approved";

  const featherPrice = getEffectiveFeatherPrice(
    album.effective_feather_price ?? album.feather_price,
    DEFAULT_PRIVATE_ALBUM_FEATHER_PRICE,
  );

  const title = album.translations?.[locale]?.title || album.title;
  const description = album.translations?.[locale]?.description || album.description;

  return (
    <ScrollReveal className="h-full">
      <Link
        href={`/albums/${album.slug}`}
        prefetch={false}
        className="group block min-w-0 h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          data-nature-surface="album-card"
          className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.25rem] sm:rounded-[1.4rem] border border-border/30 bg-surface-secondary/40 backdrop-blur-[2px] shadow-sm transition-all duration-700 ease-out group-hover:border-border/70 group-hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.35)] group-hover:-translate-y-0.5"
        >
          {/* STATIC HIGH-RES POSTER WITH LUXURIOUS GENTLE HOVER */}
          <div className="absolute inset-0 h-full w-full overflow-hidden">
            {coverTarget.src ? (
              <ReliableMediaImage
                target={coverTarget}
                alt={title}
                fill
                sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                loading={priority ? "eager" : "lazy"}
                priority={priority}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-secondary/60 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent to-black/5" />
                {album.status === "private" ? (
                  <Lock className="h-6 w-6 text-text-secondary/30 relative z-10" aria-hidden="true" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-text-secondary/30 -rotate-90 relative z-10">
                    <div className="h-px w-10 bg-text-secondary/20" />
                    <span className="text-[0.55rem] uppercase tracking-[0.3em] font-medium">Archive</span>
                    <div className="h-px w-10 bg-text-secondary/20" />
                  </div>
                )}
              </div>
            )}

            {/* Status Badges - Top Left */}
            <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-col gap-1.5 z-10">
              <Badge
                className={
                  album.status === "public"
                    ? "bg-black/45 text-white/95 backdrop-blur-md font-medium tracking-widest text-[0.58rem] uppercase border border-white/15 shadow-sm"
                    : album.status === "updating"
                    ? "bg-accent/90 text-accent-foreground backdrop-blur-md font-medium tracking-widest text-[0.58rem] uppercase border border-accent/40 shadow-sm"
                    : "bg-black/55 text-white/95 backdrop-blur-md font-medium tracking-widest text-[0.58rem] uppercase border border-white/15 shadow-sm"
                }
              >
                {album.status === "public"
                  ? (dict?.albums?.welcome_badge || "Public")
                  : album.status === "updating"
                  ? (dict?.albums?.status_updating || "Updating")
                  : (dict?.albums?.status_private || "Private")}
              </Badge>
            </div>

            <AlbumViewBadge albumId={album.id} dict={dict} />

            {/* Badges - Top Right */}
            {album.status === "private" ? (
              <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-full border border-white/15 bg-black/50 p-1.5 text-white/90 backdrop-blur-md shadow-sm z-10">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            ) : null}

            {album.status === "updating" ? (
              <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-full border border-white/15 bg-black/50 p-1.5 text-white/90 backdrop-blur-md shadow-sm z-10">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            ) : null}

            {videoPreview ? (
              <div className="absolute top-2.5 right-11 sm:top-3 sm:right-12 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-md shadow-sm z-10">
                Motion
              </div>
            ) : null}
          </div>

          {/* CINEMATIC BOTTOM GRADIENT SCRIM (Integrated Title & Description) */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 via-60% to-transparent pt-16 sm:pt-20 pb-3 sm:pb-3.5 px-3 sm:px-3.5 text-white z-10 flex flex-col justify-end transition-all duration-300">
            <h3 className="font-serif text-[0.95rem] sm:text-[1.08rem] font-medium leading-snug text-white line-clamp-1 group-hover:text-amber-100/95 transition-colors duration-500 drop-shadow-md">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-[0.74rem] sm:text-[0.78rem] leading-relaxed text-white/80 font-light line-clamp-1 drop-shadow-sm">
                {description}
              </p>
            ) : null}

            {/* Subtle works count & interactive cue */}
            <div className="mt-1.5 flex items-center justify-between text-[0.62rem] sm:text-[0.65rem] text-white/70 font-light tracking-wide">
              <span>{album.media_count} {dict?.albums?.works || "works"}</span>
              <span className="uppercase tracking-widest text-[0.58rem] text-white/90 font-medium group-hover:translate-x-1 transition-transform duration-500">{dict?.albums?.open_collection || "Open"} →</span>
            </div>

            {/* Private album access status or unlock option */}
            {album.status === "private" && (
              <div className="mt-2 pt-1.5 border-t border-white/15 flex items-center justify-between text-[0.68rem] gap-2">
                {album.access_request_status === "approved" ? (
                  <span className="font-semibold uppercase tracking-wider text-emerald-400 text-[0.65rem]">
                    {dict?.albums?.access_approved || "Approved"}
                  </span>
                ) : album.access_request_status === "pending" ? (
                  <span className="font-semibold uppercase tracking-wider text-amber-300 text-[0.65rem]">
                    {dict?.albums?.request_pending || "Pending"}
                  </span>
                ) : album.access_request_status === "rejected" ? (
                  <span className="font-semibold uppercase tracking-wider text-rose-400 text-[0.65rem]">
                    {dict?.albums?.request_rejected || "Denied"}
                  </span>
                ) : (
                  <AlbumAccessRequestButton album={album} dict={dict} />
                )}
                {canPurchaseWithFeathers && featherPrice ? (
                  <span className="inline-flex items-center gap-1 font-medium text-white/90 text-[0.65rem] shrink-0">
                    <Feather className="h-3 w-3 text-amber-400" aria-hidden="true" />
                    {featherPrice}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Link>
    </ScrollReveal>
  );
}
