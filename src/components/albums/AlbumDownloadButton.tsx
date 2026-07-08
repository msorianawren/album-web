"use client";

"use client";

import { Archive } from "lucide-react";
import { DownloadButton } from "@/components/media/DownloadButton";
import { useI18n } from "@/lib/i18n-client";

interface AlbumDownloadButtonProps {
  albumId: string;
  disabled?: boolean;
}

export function AlbumDownloadButton({ albumId, disabled }: AlbumDownloadButtonProps) {
  const { t } = useI18n();
  return (
    <section className="mx-auto w-full max-w-[960px] px-4 pb-10 sm:px-8">
      <div className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-border bg-surface/80 p-6 text-center shadow-xl shadow-text-primary/5 sm:flex-row sm:text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">
            {t("album.archive")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">
            {t("album.downloadTitle")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t("album.downloadBody")}
          </p>
        </div>
        <DownloadButton
          href={`/api/albums/${albumId}/download`}
          label={t("album.downloadAlbum")}
          disabled={disabled}
        />
        <Archive className="hidden h-5 w-5 text-text-secondary" aria-hidden="true" />
      </div>
    </section>
  );
}
