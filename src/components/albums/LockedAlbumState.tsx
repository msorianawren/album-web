import Image from "next/image";
import { Lock } from "lucide-react";
import type { AlbumDetail } from "@/lib/types";

export function LockedAlbumState({ album }: { album: AlbumDetail }) {
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
          Private album
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
          {album.private_message ??
            "This album is private. Please contact the owner for access."}
        </p>
        
        {album.access_request_status === "approved" ? (
          <div className="mt-8 inline-flex self-start items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
            Access Approved
          </div>
        ) : album.access_request_status === "pending" ? (
          <div className="mt-8 inline-flex self-start items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
            Request Under Review
          </div>
        ) : album.access_request_status === "rejected" ? (
          <div className="mt-8 inline-flex self-start items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Access Not Approved
          </div>
        ) : (
          <button 
            className="mt-8 self-start inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition hover:-translate-y-0.5"
            onClick={(e) => {
              e.preventDefault();
              document.dispatchEvent(new CustomEvent("open-access-request", { detail: album }));
            }}
          >
            Request Private Access
          </button>
        )}
      </div>
    </section>
  );
}
