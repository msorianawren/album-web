"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AlbumStatus } from "@/lib/types";

export function AlbumPagination({
  status,
  limit,
  q,
  currentPage,
  totalCount,
}: {
  status: AlbumStatus;
  limit: number;
  q: string;
  currentPage: number;
  totalCount: number;
}) {
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    params.delete("cursor");
    return `/albums?${params.toString()}#albums`;
  };

  // Build page numbers: 1, ..., X-1, X, X+1, ..., Last
  const pages: (number | string)[] = [];
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="mt-14 flex justify-center items-center gap-1 sm:gap-2">
      {currentPage > 1 && (
        <Link
          href={createPageUrl(1)}
          className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors"
        >
          First
        </Link>
      )}
      
      {pages.map((p, idx) => {
        if (p === "...") {
          return <span key={`ellipsis-${idx}`} className="px-1 sm:px-2 text-text-secondary/40">...</span>;
        }
        const pageNum = p as number;
        const isActive = pageNum === currentPage;
        
        return (
          <Link
            key={pageNum}
            href={createPageUrl(pageNum)}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] transition-colors ${
              isActive 
                ? "bg-text-primary text-background font-medium" 
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
          >
            {pageNum}
          </Link>
        );
      })}

      {currentPage < totalPages && (
        <Link
          href={createPageUrl(totalPages)}
          className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors"
        >
          Last
        </Link>
      )}
    </div>
  );
}
