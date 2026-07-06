import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HomeHero() {
  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
      <div className="flex flex-col justify-center">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          Premium photo albums
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] text-text-primary sm:text-6xl">
          Your memories, beautifully organized.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
          Store, organize, and share photo collections with fast galleries,
          private album controls, and R2-backed image delivery.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create album
          </Button>
          <Button variant="secondary">
            Explore public albums
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-surface-secondary">
        <div className="absolute inset-0 grid grid-cols-2 gap-3 p-3">
          <div className="overflow-hidden rounded-[1.4rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85"
              alt="Ocean shoreline album preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-[1.4rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85"
                alt="Mountain trail album preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-[1.4rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=85"
                alt="Poolside album preview"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
