"use client";

import Link from "next/link";
import { Heart, Lock, MessageCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Album } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { DepthSurface } from "@/components/ui/DepthSurface";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import { LivingPreviewImages } from "@/components/albums/LivingPreviewImages";
import {
  createMediaDeliveryTarget,
  getMediaDeliveryDescriptor,
  type MediaDeliveryTarget,
} from "@/lib/media/delivery";
import type { AppDictionary } from "@/lib/i18n";

interface AlbumCardProps {
  album: Album;
  dict?: AppDictionary;
  locale?: string;
}

export function AlbumCard({ album, dict, locale = "en" }: AlbumCardProps) {
  const previewItems = album.preview_items ?? [];
  const hasAuthorizedPrivatePreviews = album.status === "private" && previewItems.length > 0;
  const previewImages: MediaDeliveryTarget[] = album.status === "private"
    ? hasAuthorizedPrivatePreviews
      ? [
          ...previewItems
            .filter((item) => item.media_type === "image")
            .map((item) => getMediaDeliveryDescriptor(item, {
              albumStatus: "private",
              isAuthorized: true,
            }).card),
          createMediaDeliveryTarget(album.cover_url),
        ].filter((target, index, values) => Boolean(target.src) && values.findIndex((value) => value.src === target.src) === index).slice(0, 4)
      : [createMediaDeliveryTarget(album.safe_preview_url, "safe-preview")].filter((target) => Boolean(target.src))
    : [
        ...previewItems
          .filter((item) => item.media_type === "image")
          .map((item) => getMediaDeliveryDescriptor(item, { albumStatus: album.status }).card),
        createMediaDeliveryTarget(album.cover_url),
      ].filter((target, index, values) => Boolean(target.src) && values.findIndex((value) => value.src === target.src) === index).slice(0, 4);
  const videoPreview = (album.status !== "private" || hasAuthorizedPrivatePreviews)
    ? previewItems.find((item) => item.media_type === "video")
    : null;

  const { getAlbumViewState } = useAlbumViewMemory();
  const viewState = getAlbumViewState(album.id);

  return (
    <ScrollReveal>
      <Link
        href={`/albums/${album.slug}`}
        className="group block min-w-0 rounded-[1.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div data-nature-surface="album-card" className="relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-surface/30 p-2 shadow-sm transition duration-500 ease-out group-hover:border-border/80 group-hover:bg-surface/60 group-hover:shadow-md">
        <DepthSurface glare className="living-preview-frame aspect-[3/4] w-full overflow-hidden rounded-[1.2rem] bg-surface-secondary">
        <div className="relative h-full w-full overflow-hidden">
          {previewImages.length ? (
            <LivingPreviewImages
              images={previewImages}
              title={album.title}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              imageClassName="grayscale-[15%] group-hover:grayscale-0"
            />
          ) : (
            <div className="living-preview-placeholder flex h-full w-full items-center justify-center bg-surface-secondary relative overflow-hidden border border-border/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent to-black/5" />
              <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
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
          <div className="living-preview-light" aria-hidden="true" />
          <div className="absolute left-4 top-4">
            <Badge
              className={album.status === "public" ? "bg-background/80 text-text-primary backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border border-border/40" : album.status === "updating" ? "bg-accent/80 text-accent-foreground backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border border-accent/40" : "bg-background/80 text-text-primary backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border border-border/40"}
            >
              {album.status === "public" 
                ? (dict?.albums?.welcome_badge || "Public") 
                : album.status === "updating" 
                ? (dict?.albums?.status_updating || "Updating") 
                : (dict?.albums?.status_private || "Private")}
            </Badge>
          </div>
          {viewState.isRecentlyViewed && (
            <div className="absolute left-4 top-12 mt-2">
              <Badge className="bg-white/90 text-black backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border-none shadow-sm">
                {dict?.albums?.recently_viewed || "Recently viewed"}
              </Badge>
            </div>
          )}
          {!viewState.isRecentlyViewed && viewState.isViewed && (
            <div className="absolute left-4 top-12 mt-2">
              <Badge className="bg-black/40 text-white/90 backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border border-white/20 shadow-sm">
                {dict?.albums?.viewed || "Viewed"}
              </Badge>
            </div>
          )}
          {videoPreview ? (
            <div className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-md">
              Motion
            </div>
          ) : null}
          {album.status === "private" ? (
            <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-md">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          {album.status === "updating" ? (
            <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-md">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-white/80 mb-1">
              {dict?.albums?.open_collection || "Open archive"}
            </p>
            <p className="text-sm font-light text-white">
              {album.media_count} {dict?.albums?.works || "works"}
            </p>
          </div>
        </div>
        </DepthSurface>
      </div>
      <div className="mt-6 px-2 text-center md:text-left">
        <h3 className="font-serif text-2xl text-text-primary group-hover:text-accent transition-colors duration-300">
          {album.translations?.[locale]?.title || album.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-[0.9rem] leading-[1.6] font-light text-text-secondary">
          {album.translations?.[locale]?.description || album.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-4 text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary">
          <span>{formatMediaCount(album.photo_count, album.video_count, dict)}</span>
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-3 w-3" aria-hidden="true" />
            {album.like_count}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-3 w-3" aria-hidden="true" />
            {album.comment_count}
          </span>
        </div>
      </div>
      {album.status === "private" && (
        <div className="mt-5 px-2 text-center md:text-left">
          {album.access_request_status === "approved" ? (
            <div className="inline-flex items-center gap-2 border-b border-green-500/30 pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
              {dict?.albums?.access_approved || "Approved"}
            </div>
          ) : album.access_request_status === "pending" ? (
            <div className="inline-flex items-center gap-2 border-b border-yellow-500/30 pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
              {dict?.albums?.request_pending || "Request under review"}
            </div>
          ) : album.access_request_status === "rejected" ? (
            <div className="inline-flex items-center gap-2 border-b border-red-500/30 pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
              {dict?.albums?.request_rejected || "Access not approved"}
            </div>
          ) : (
            <button 
              className="inline-flex items-center justify-center gap-2 border-b border-text-primary/40 pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-text-primary transition-colors hover:text-accent hover:border-accent"
              onClick={(e) => {
                e.preventDefault();
                // We will dispatch a custom event to open the request modal
                document.dispatchEvent(new CustomEvent("open-access-request", { detail: album }));
              }}
            >
              {dict?.albums?.request_access || "Request private access"}
            </button>
          )}
        </div>
      )}
      </Link>
    </ScrollReveal>
  );
}
