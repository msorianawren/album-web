import Link from "next/link";
import type { Album, SiteSettings } from "@/lib/types";

export function HomeAlbumWorlds({ albums, settings }: { albums: Album[], settings?: SiteSettings }) {
  const publicAlbums = albums.filter((a) => a.status === "public").slice(0, 4);
  
  const placeholders = [
    { title: "Vietnamese Elegance", href: "/albums?q=vietnamese", image: null as string | null },
    { title: "Cinematic Portraits", href: "/albums?q=portraits", image: null as string | null },
    { title: "Travel Diary", href: "/albums?q=travel", image: null as string | null },
  ];

  const displayCards = publicAlbums.length > 0 
    ? publicAlbums.map(a => ({ title: a.title, href: `/albums/${a.id}`, image: a.cover_url }))
    : placeholders;

  const mode = settings?.album_list_layout || "grid";

  if (mode === "editorial_list") {
    return (
      <section className="relative mx-auto w-full max-w-[1000px] px-6 py-24 sm:py-32">
        <div className="mb-20 flex flex-col items-center justify-center text-center">
          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary mb-4">Archives</span>
          <h2 className="font-serif text-4xl font-normal text-text-primary sm:text-5xl lg:text-[4rem] leading-none">
            Featured Collections
          </h2>
        </div>

        <div className="flex flex-col border-t border-border/40">
          {displayCards.map((card, idx) => (
            <Link
              key={idx}
              href={card.href}
              className="group flex flex-col md:flex-row items-center gap-10 py-10 md:py-16 border-b border-border/40"
            >
              <div className="w-full md:w-[45%] relative aspect-[4/3] overflow-hidden bg-surface-secondary">
                {card.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover transition duration-[2s] ease-out group-hover:scale-105" loading="lazy" />
                )}
              </div>
              <div className="w-full md:w-[55%] flex flex-col justify-center items-center text-center md:items-start md:text-left">
                <span className="text-[0.68rem] uppercase tracking-[0.2em] text-text-secondary mb-3">No. 0{idx + 1}</span>
                <h3 className="font-serif text-3xl md:text-4xl text-text-primary group-hover:text-accent transition-colors duration-300">
                  {card.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-20 text-center">
          <Link href="/albums" className="inline-flex items-center justify-center border-b border-text-primary pb-1 text-[0.72rem] uppercase tracking-[0.18em] font-medium transition-colors hover:text-accent hover:border-accent">
            Explore All Albums
          </Link>
        </div>
      </section>
    );
  }

  // Grid / Carousel (Treating both as a stylized grid for now, but limiting carousel style to horizontal scrolling if needed)
  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="mb-16 flex flex-col items-center justify-center text-center">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary mb-4">Archives</span>
        <h2 className="font-serif text-4xl font-normal text-text-primary sm:text-5xl lg:text-[4rem] leading-none">
          Featured Collections
        </h2>
      </div>

      <div className={`grid gap-6 sm:grid-cols-2 ${mode === "grid" ? "lg:grid-cols-2" : "lg:grid-cols-4 overflow-x-auto snap-x snap-mandatory pb-4"} `}>
        {displayCards.slice(0, mode === "grid" ? 4 : 4).map((card, idx) => (
          <Link
            key={idx}
            href={card.href}
            className={`group relative block aspect-[4/5] overflow-hidden rounded-[1rem] bg-surface-secondary shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-xl ${mode === "carousel" ? "min-w-[280px] snap-center" : ""}`}
          >
            {card.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100 grayscale-[15%] group-hover:grayscale-0" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h3 className="font-serif text-2xl font-normal text-white">
                {card.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-16 text-center">
        <Link href="/albums" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-transparent px-8 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-text-primary transition-all hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Explore All Albums
        </Link>
      </div>
    </section>
  );
}
