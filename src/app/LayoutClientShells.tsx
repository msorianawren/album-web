"use client";

/**
 * LayoutClientShells wraps client-only layout components that use next/dynamic
 * with ssr:false. This file MUST be a Client Component so that next/dynamic
 * with ssr:false is valid. Without this wrapper, BailoutToCSR would be thrown
 * from within a Server Component (layout.tsx) causing the entire page to fall
 * back to the loading skeleton with no visible content.
 */

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PublicDepthEnvironment } from "@/components/environment/PublicDepthEnvironment";
import type { PublicSession } from "@/lib/types";

const OrianaCompanionRuntime = dynamic(
  () => import("@/components/assistant/OrianaCompanionRuntime").then((m) => m.OrianaCompanionRuntime),
  { ssr: false },
);

export function EnvironmentShell() {
  const pathname = usePathname() ?? "/";
  const isEnvironmentRoute =
    pathname === "/" ||
    pathname === "/albums" ||
    pathname.startsWith("/albums/") ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/games" ||
    pathname === "/profile";

  if (!isEnvironmentRoute) return null;

  return <PublicDepthEnvironment />;
}

export function CompanionShell({ session }: { session: PublicSession }) {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/studio")) return null;
  if (pathname.startsWith("/login")) return null;
  if (pathname.startsWith("/api")) return null;

  return (
    <Suspense fallback={null}>
      <OrianaCompanionRuntime session={session} />
    </Suspense>
  );
}
