"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Album } from "@/lib/types";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

function collectionCover(album: Album) {
  const preferred = album.preview_items?.find((item) => item.id === album.cover_media_id)
    ?? album.preview_items?.find((item) => item.media_type === "image")
    ?? album.preview_items?.[0];

  return preferred?.medium_url
    ?? preferred?.card_url
    ?? preferred?.thumbnail_url
    ?? preferred?.url
    ?? album.cover_url;
}

export function HomeAlbumWorlds({ albums }: { albums: Album[] }) {
  const collections = albums.filter((album) => album.status === "public").slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (collections.length === 0) return null;

  const active = collections[Math.min(activeIndex, collections.length - 1)];

  const handleHover = (index: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex(index);
    }, 60);
  };

  const handleCancelHover = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  return (
    <section id="featured-collections" className="lcb-collections relative overflow-hidden" aria-labelledby="featured-collections-heading">
      <SakuraCorner position="top-right" />
      <div className="lcb-section-heading">
        <p className="flex items-center gap-2">
          <span>Public archive</span>
          <SakuraCrest className="h-3 w-3 opacity-75" />
        </p>
        <h2 id="featured-collections-heading">Featured Collections</h2>
      </div>

      <div className="lcb-collections__desktop">
        <Link 
          href={`/albums/${active.slug || active.id}`} 
          prefetch={false} 
          className="lcb-collections__preview relative overflow-hidden rounded-2xl border border-border/30 bg-surface-secondary/30" 
          aria-label={`Open ${active.title}`}
        >
          {collections.map((album, index) => {
            const cover = collectionCover(album);
            const isCurrent = index === activeIndex;
            return cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                key={album.id} 
                src={cover} 
                alt="" 
                loading="lazy" 
                className={`absolute inset-0 h-full w-full object-contain p-4 transition-opacity duration-700 ease-out ${
                  isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              />
            ) : null;
          })}
        </Link>

        <div className="lcb-collections__index" role="list">
          {collections.map((album, index) => (
            <Link
              key={album.id}
              href={`/albums/${album.slug || album.id}`}
              prefetch={false}
              role="listitem"
              data-active={index === activeIndex}
              onMouseEnter={() => handleHover(index)}
              onMouseLeave={handleCancelHover}
              onFocus={() => setActiveIndex(index)}
            >
              <span className="lcb-collections__title">{album.title}</span>
              <span className="lcb-collections__meta">
                {album.media_count} {album.media_count === 1 ? "frame" : "frames"} · {album.status}
              </span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <div className="lcb-collections__mobile">
        {collections.map((album) => (
          <Link key={album.id} href={`/albums/${album.slug || album.id}`} prefetch={false}>
            <h3>{album.title}</h3>
            {collectionCover(album) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collectionCover(album)!} alt="" loading="lazy" />
            ) : <span className="lcb-collections__placeholder" aria-hidden="true" />}
            <p>{album.media_count} {album.media_count === 1 ? "frame" : "frames"} · {album.status}</p>
          </Link>
        ))}
      </div>

      <Link href="/albums" prefetch={false} className="lcb-text-link">Explore All Albums</Link>
    </section>
  );
}
