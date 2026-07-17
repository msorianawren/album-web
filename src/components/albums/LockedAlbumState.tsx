"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Feather, Lock } from "lucide-react";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { createMediaDeliveryTarget } from "@/lib/media/delivery";
import type { AlbumDetail } from "@/lib/types";

export function LockedAlbumState({
  album,
  wrenFeathers,
  defaultFeatherPrice,
}: {
  album: AlbumDetail;
  wrenFeathers: number;
  defaultFeatherPrice: number;
}) {
  const router = useRouter();
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const price = album.feather_price ?? defaultFeatherPrice;
  const canPurchase = album.status === "private" && album.feather_purchase_enabled !== false;

  async function purchaseAccess() {
    setPurchasing(true);
    setPurchaseMessage(null);
    try {
      const response = await fetch(`/api/albums/${album.id}/feather-purchase`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setPurchaseMessage(payload?.message ?? "Could not complete the Feather unlock.");
        return;
      }
      router.refresh();
    } catch {
      setPurchaseMessage("Could not complete the Feather unlock. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 pb-20 pt-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-surface">
        {album.cover_url ? (
          <ReliableMediaImage
            target={createMediaDeliveryTarget(album.cover_url, "safe-preview")}
            alt={`${album.title} private album cover`}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover transition-opacity duration-150"
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
        ) : null}
        {album.access_request_status !== "approved" && album.access_request_status !== "pending" && album.access_request_status !== "rejected" ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition hover:-translate-y-0.5"
              onClick={() => {
              document.dispatchEvent(new CustomEvent("open-access-request", { detail: album }));
              }}
            >
              Request Private Access
            </button>
          </div>
        ) : null}
        {canPurchase ? (
          <button
            type="button"
            onClick={purchaseAccess}
            disabled={purchasing || wrenFeathers < price}
            className="mt-3 inline-flex self-start items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-primary transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Feather className="h-4 w-4" aria-hidden="true" />
            {purchasing ? "Unlocking..." : `Unlock for ${price} Feathers`}
          </button>
        ) : null}
        {canPurchase ? (
          <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
            Balance: {wrenFeathers} Wren Feathers{wrenFeathers < price ? ` - ${price - wrenFeathers} more needed` : ""}.
          </p>
        ) : null}
        {purchaseMessage ? <p className="mt-3 text-sm text-red-600" role="alert">{purchaseMessage}</p> : null}
      </div>
    </section>
  );
}
