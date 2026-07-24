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
import type { PublicSession } from "@/lib/types";

const PublicDepthEnvironment = dynamic(
  () => import("@/components/environment/PublicDepthEnvironment").then((m) => m.PublicDepthEnvironment),
  { ssr: false },
);

const OrianaCompanionRuntime = dynamic(
  () => import("@/components/assistant/OrianaCompanionRuntime").then((m) => m.OrianaCompanionRuntime),
  { ssr: false },
);

export function EnvironmentShell() {
  return (
    <Suspense fallback={null}>
      <PublicDepthEnvironment />
    </Suspense>
  );
}

export function CompanionShell({ session }: { session: PublicSession }) {
  return (
    <Suspense fallback={null}>
      <OrianaCompanionRuntime session={session} />
    </Suspense>
  );
}
