"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AlbumPageSizeSelect({ defaultValue }: { defaultValue: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const changePageSize = (limit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(limit));
    router.push(`/albums?${params.toString()}`);
  };

  return (
    <select
      value={defaultValue}
      onChange={(event) => changePageSize(Number(event.target.value))}
      className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none"
      aria-label="Albums per batch"
    >
      {[12, 24, 48, 96].map((size) => (
        <option key={size} value={size}>{size} per batch</option>
      ))}
    </select>
  );
}
