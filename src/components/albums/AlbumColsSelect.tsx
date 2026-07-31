"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AlbumColsSelect({ defaultValue }: { defaultValue: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeCols = (cols: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cols", String(cols));
    router.push(`/albums?${params.toString()}`);
  };

  return (
    <select
      value={defaultValue}
      onChange={(event) => changeCols(Number(event.target.value))}
      className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none"
      aria-label="Columns"
    >
      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
        <option key={size} value={size}>{size} columns</option>
      ))}
    </select>
  );
}
