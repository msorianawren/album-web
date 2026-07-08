import Image from "next/image";
import { Lock } from "lucide-react";
import { getDictionary, getRequestLocale, translate } from "@/lib/i18n";
import type { AlbumDetail } from "@/lib/types";

export async function LockedAlbumState({ album }: { album: AlbumDetail }) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(getDictionary(locale), key);

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 pb-20 pt-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-surface">
        {album.cover_url ? (
          <Image
            src={album.cover_url}
            alt={`${album.title} private album cover`}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Lock className="h-10 w-10 text-text-secondary" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center rounded-[2rem] border border-border bg-surface p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-background">
          <Lock className="h-6 w-6 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-3xl font-semibold text-text-primary">
          {t("album.privateTitle")}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
          {album.private_message ??
            t("album.privateDescription")}
        </p>
      </div>
    </section>
  );
}
