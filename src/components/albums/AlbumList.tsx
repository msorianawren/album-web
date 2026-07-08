import { Camera } from "lucide-react";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { Button } from "@/components/ui/Button";
import { getDictionary, getRequestLocale, translate } from "@/lib/i18n";
import type { Album } from "@/lib/types";

interface AlbumListProps {
  albums: Album[];
}

export async function AlbumList({ albums }: AlbumListProps) {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(getDictionary(locale), key);

  if (!albums.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-surface">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          {t("albums.emptyTitle")}
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          {t("albums.emptyBody")}
        </p>
      </section>
    );
  }

  return (
    <section
      id="albums"
      className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12"
    >
      <div className="mb-7 flex items-end justify-between gap-4 animate-editorial-in">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
            {t("albums.selected")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary sm:text-3xl">
            {t("albums.featured")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("albums.subtitle")}
          </p>
        </div>
      </div>
      <form action="/albums" className="mb-8 grid gap-3 rounded-[1.3rem] border border-border bg-surface/75 p-3 shadow-xl shadow-text-primary/5 backdrop-blur sm:rounded-[1.6rem] sm:p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          placeholder={t("albums.searchPlaceholder")}
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        />
        <select
          name="status"
          className="h-12 rounded-full border border-border bg-background/70 px-5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="">{t("albums.allStatuses")}</option>
          <option value="public">{t("albums.public")}</option>
          <option value="updating">{t("albums.updating")}</option>
          <option value="private">{t("albums.private")}</option>
        </select>
        <Button type="submit" className="w-full md:w-auto">{t("albums.search")}</Button>
      </form>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
