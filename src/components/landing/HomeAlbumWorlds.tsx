"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Album } from "@/lib/types";

export function HomeAlbumWorlds({ albums }: { albums: Album[] }) {
  const collections = albums.filter((album) => album.status === "public").slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);

  if (collections.length === 0) return null;

  const active = collections[Math.min(activeIndex, collections.length - 1)];

  return (
    <section id="featured-collections" className="lcb-collections" aria-labelledby="featured-collections-heading">
      <div className="lcb-section-heading">
        <p>Public archive</p>
        <h2 id="featured-collections-heading">Featured Collections</h2>
      </div>

      <div className="lcb-collections__desktop">
        <Link href={`/albums/${active.slug || active.id}`} prefetch={false} className="lcb-collections__preview" aria-label={`Open ${active.title}`}>
          {active.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={active.id} src={active.cover_url} alt="" loading="lazy" />
          ) : <span aria-hidden="true" />}
        </Link>

        <div className="lcb-collections__index" role="list">
          {collections.map((album, index) => (
            <Link
              key={album.id}
              href={`/albums/${album.slug || album.id}`}
              prefetch={false}
              role="listitem"
              data-active={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
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
            {album.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={album.cover_url} alt="" loading="lazy" />
            ) : <span className="lcb-collections__placeholder" aria-hidden="true" />}
            <p>{album.media_count} {album.media_count === 1 ? "frame" : "frames"} · {album.status}</p>
          </Link>
        ))}
      </div>

      <Link href="/albums" prefetch={false} className="lcb-text-link">Explore All Albums</Link>
    </section>
  );
}
