import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import { ShareButton } from "@/components/ui/ShareButton";
import { AlbumMemoryHint } from "@/components/albums/AlbumMemoryHint";
import type { AlbumDetail } from "@/lib/types";
import { formatMediaCount } from "@/lib/utils";
import type { AppDictionary } from "@/lib/i18n";

interface AlbumHeaderProps {
  album: AlbumDetail;
  dict?: AppDictionary;
}

export function AlbumHeader({ album, dict }: AlbumHeaderProps) {
  const previewImages = [
    ...(album.media ?? [])
      .filter((item) => item.media_type === "image")
      .slice(0, 4)
      .map((item) => item.medium_url ?? item.thumbnail_url ?? item.url),
    album.cover_url,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index).slice(0, 4);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-20 lg:py-32 grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <div className="living-preview-frame relative aspect-[3/4] sm:aspect-square lg:aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-surface-secondary shadow-xl shadow-text-primary/5">
        {previewImages.length ? (
          previewImages.map((src, index) => (
            <Image
              key={`${src}-${index}`}
              src={src}
              alt={index === 0 ? `${album.title} animated album preview` : ""}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="living-preview-image object-cover grayscale-[15%] transition-all duration-[3s]"
              style={{
                animationDelay: `${index * 3.2}s`,
                opacity: index === 0 ? 1 : undefined,
              }}
              priority={index === 0}
            />
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-text-secondary/30" aria-hidden="true" />
          </div>
        )}
        <div className="living-preview-light" aria-hidden="true" />
      </div>
      <div className="min-w-0 pb-3 animate-editorial-in flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <AlbumStatusBadge status={album.status} />
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-text-secondary">
            {formatMediaCount(album.photo_count, album.video_count, dict)}
          </p>
        </div>
        <h1 className="font-serif text-[3rem] sm:text-6xl lg:text-7xl font-light leading-[1.05] text-text-primary mb-8">
          {album.title}
        </h1>
        <p className="max-w-[500px] text-[1.05rem] leading-[1.8] font-light text-text-secondary">
          {album.description}
        </p>
        <AlbumMemoryHint albumId={album.id} dict={dict} />
        <div className="mt-12 flex flex-wrap gap-4 items-center">
          <ShareButton title={album.title} />
          {album.download_allowed ? (
            <DownloadButton href={`/api/albums/${album.id}/download`} label="Download album" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
