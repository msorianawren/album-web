"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AlbumError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-5 text-center text-lg font-semibold text-text-primary">
        Album Web
      </div>
      <section className="mx-auto flex min-h-[60vh] w-full max-w-[1440px] flex-col items-center justify-center px-4 text-center sm:px-8 lg:px-12">
        <h1 className="text-3xl font-semibold text-text-primary">
          Could not open this album
        </h1>
        <p className="mt-3 max-w-md text-text-secondary">
          The album is temporarily unavailable. Private albums use a separate
          locked-access screen.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-text-secondary" role="status">
            Reference: {error.digest}
          </p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </section>
    </main>
  );
}
