import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-8 lg:px-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-24 max-w-3xl" />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="aspect-[4/3] rounded-[1.5rem]" />
              <Skeleton className="mt-4 h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
