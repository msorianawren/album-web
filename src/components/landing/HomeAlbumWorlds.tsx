import Link from "next/link";
import type { Album } from "@/lib/types";

export function HomeAlbumWorlds({ albums }: { albums: Album[] }) {
  const publicAlbums = albums.filter((a) => a.status === "public").slice(0, 3);
  
  const placeholders = [
    { title: "Vietnamese Elegance", href: "/albums?q=vietnamese", image: null as string | null },
    { title: "Cinematic Portraits", href: "/albums?q=portraits", image: null as string | null },
    { title: "Travel Diary", href: "/albums?q=travel", image: null as string | null },
  ];

  const displayCards = publicAlbums.length >= 3 
    ? publicAlbums.map(a => ({ title: a.title, href: `/albums/${a.id}`, image: a.cover_url }))
    : placeholders;

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="mb-12 flex flex-col items-center justify-center text-center">
        <h2 className="font-serif text-3xl font-light text-text-primary sm:text-4xl">
          Featured Collections
        </h2>
        <span className="mt-6 h-px w-24 bg-border" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayCards.map((card, idx) => (
          <Link
            key={idx}
            href={card.href}
            className="group relative block aspect-[3/4] overflow-hidden rounded-[1.4rem] bg-surface-secondary shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl"
          >
            {card.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-xl font-medium tracking-wide text-white drop-shadow-md">
                {card.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-16 text-center">
        <Link href="/albums" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-transparent px-8 text-sm font-medium uppercase tracking-[0.14em] text-text-primary transition-all hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Explore All Albums
        </Link>
      </div>
    </section>
  );
}
