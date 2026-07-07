"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function labelForSegment(segment: string) {
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return "Edit";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StudioBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const crumbs = [{ href: "/studio", label: "Studio" }].concat(
    segments.map((segment, index) => ({
      href: `/studio/${segments.slice(0, index + 1).join("/")}`,
      label: labelForSegment(segment),
    })),
  );

  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-text-secondary" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.href}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden="true" /> : null}
          {index === crumbs.length - 1 ? (
            <span className="font-medium text-text-primary">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="rounded-md hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
