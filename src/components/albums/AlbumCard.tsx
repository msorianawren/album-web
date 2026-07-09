"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Lock, MessageCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Album } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface AlbumCardProps {
  album: Album;
  dict?: any;
  locale?: string;
}

export function AlbumCard({ album, dict, locale = "en" }: AlbumCardProps) {
  const previewItems = album.preview_items ?? [];
  const previewImages = album.status === "private" 
    ? [album.safe_preview_url].filter(Boolean) as string[]
    : [
        ...previewItems
          .filter((item) => item.media_type === "image")
          .map((item) => item.thumbnail_url ?? item.medium_url ?? item.url)
          .filter(Boolean),
        album.cover_url,
      ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).slice(0, 4);
  const videoPreview = album.status !== "private" && previewItems.find((item) => item.media_type === "video");

  return (
    <ScrollReveal>
      <Link
        href={`/albums/${album.slug}`}
        className="group block min-w-0 rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div data-nature-surface="album-card" className="relative overflow-hidden rounded-[1.8rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-[var(--preset-accent)] group-hover:bg-[var(--preset-hover-bg)] group-hover:shadow-[var(--preset-glow)]">
        <div className="living-preview-frame relative aspect-[3/4] overflow-hidden rounded-[1.45rem] bg-surface-secondary">
          {previewImages.length ? (
            previewImages.map((src, index) => (
              <Image
                key={`${src}-${index}`}
                src={src}
                alt={index === 0 ? `${album.title} animated album preview` : ""}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="living-preview-image object-cover"
                style={{
                  animationDelay: `${index * 3.2}s`,
                  opacity: index === 0 ? 1 : undefined,
                }}
              />
            ))
          ) : (
            <div className="living-preview-placeholder flex h-full w-full items-center justify-center bg-surface">
              <Lock className="h-8 w-8 text-text-secondary" aria-hidden="true" />
            </div>
          )}
          <div className="living-preview-light" aria-hidden="true" />
          <div className="absolute left-4 top-4">
            <Badge
              className={album.status === "public" ? "bg-accent text-accent-foreground" : album.status === "updating" ? "border-accent text-accent" : ""}
            >
              {album.status === "public" 
                ? (dict?.albums?.welcome_badge || "Welcome") 
                : album.status === "updating" 
                ? (dict?.albums?.status_updating || "Updating") 
                : (dict?.albums?.status_private || "Private")}
            </Badge>
          </div>
          {videoPreview ? (
            <div className="absolute bottom-4 left-4 rounded-full border border-lightbox-border bg-lightbox-control px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent-foreground backdrop-blur">
              Motion
            </div>
          ) : null}
          {album.status === "private" ? (
            <div className="absolute right-4 top-4 rounded-full border border-lightbox-border bg-lightbox-control p-2 text-accent-foreground backdrop-blur">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          {album.status === "updating" ? (
            <div className="absolute right-4 top-4 rounded-full border border-lightbox-border bg-lightbox-control p-2 text-accent-foreground backdrop-blur">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-xs font-semibold uppercase text-white/75">
              {dict?.albums?.open_collection || "Open collection"}
            </p>
            <p className="mt-1 text-sm leading-6 text-white">
              {album.media_count} {dict?.albums?.works || "works"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 px-1">
        <h3 className="break-words text-xl font-semibold text-text-primary">
          {album.translations?.[locale]?.title || album.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
          {album.translations?.[locale]?.description || album.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary">
          <span>{formatMediaCount(album.photo_count, album.video_count, dict)}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" aria-hidden="true" />
            {album.like_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" aria-hidden="true" />
            {album.comment_count}
          </span>
        </div>
      </div>
      {album.status === "private" && (
        <div className="mt-4 px-1">
          {album.access_request_status === "approved" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
              {dict?.albums?.access_approved || "Approved"}
            </div>
          ) : album.access_request_status === "pending" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
              {dict?.albums?.request_pending || "Pending"}
            </div>
          ) : album.access_request_status === "rejected" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              {dict?.albums?.request_rejected || "Rejected"}
            </div>
          ) : (
            <button 
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-wider text-text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-background"
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
