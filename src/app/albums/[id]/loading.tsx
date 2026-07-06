import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AlbumLoading() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 lg:px-12">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-14 w-72" />
        <Skeleton className="mt-5 h-16 max-w-xl" />
      </section>
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12">
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton
              key={index}
              className="mb-4 h-56 break-inside-avoid rounded-3xl"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
