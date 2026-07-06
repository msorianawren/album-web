import Image from "next/image";
import { Download, Heart, MoreHorizontal } from "lucide-react";
import type { AlbumImage } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface PhotoCardProps {
  image: AlbumImage;
  index: number;
  onOpen: (index: number) => void;
}

export function PhotoCard({ image, index, onOpen }: PhotoCardProps) {
  const aspectRatio =
    image.width && image.height ? `${image.width} / ${image.height}` : "4 / 3";

  return (
    <button
      className="group relative mb-4 block w-full overflow-hidden rounded-3xl bg-surface-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ aspectRatio }}
      onClick={() => onOpen(index)}
      aria-label={`Open ${image.file_name}`}
    >
      <Image
        src={image.file_url}
        alt={image.file_name}
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
        className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
      />
      <div className="absolute inset-0 flex items-end justify-end gap-2 bg-overlay p-3 opacity-0 transition duration-250 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
        <Button
          variant="icon"
          className="h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="icon"
          className="h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="icon"
          className="h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </button>
  );
}
