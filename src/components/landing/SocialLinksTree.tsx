import type { SocialLinkItem } from "@/lib/types";

export function SocialLinksTree({ links }: { links: SocialLinkItem[] }) {
  const displayLinks = links && links.length > 0 ? links : [
    { id: "1", platform: "Instagram", url: "#" },
    { id: "2", platform: "Portfolio", url: "#" },
  ];

  return (
    <section className="relative mx-auto w-full max-w-[800px] px-6 py-32 sm:py-48 text-center">
      <div className="mb-16">
        <h2 className="font-serif text-3xl font-light italic text-text-primary sm:text-4xl">
          Follow the branches of my visual world.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
          Portraits, travel notes, behind-the-scenes moments, and selected updates live across the channels I choose to share.
        </p>
      </div>

      <div className="relative mx-auto flex flex-col items-center">
        {/* Tree Trunk */}
        <div className="absolute bottom-0 top-0 w-[1px] bg-gradient-to-b from-transparent via-border to-transparent" />
        
        {/* Links as Leaves/Fruits */}
        <div className="relative z-10 flex w-full flex-col gap-12 sm:gap-16">
          {displayLinks.map((link, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div key={link.id} className={`flex w-full ${isLeft ? "justify-start sm:justify-end sm:pr-[50%] sm:-mr-4" : "justify-end sm:justify-start sm:pl-[50%] sm:-ml-4"} items-center`}>
                
                {/* Branch connector on desktop */}
                <div className={`hidden sm:block h-[1px] w-8 bg-border ${isLeft ? "order-2" : "order-1"}`} />
                
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group relative flex h-14 items-center justify-center rounded-full border border-border bg-surface/80 px-8 text-sm font-medium uppercase tracking-[0.14em] text-text-primary backdrop-blur transition-all duration-500 hover:scale-105 hover:border-text-primary hover:bg-background ${isLeft ? "order-1 sm:mr-0 mr-auto" : "order-2 sm:ml-0 ml-auto"}`}
                >
                  {/* Subtle Leaf/Glow Accent */}
                  <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-accent/10 opacity-0 blur-[2px] transition duration-500 group-hover:opacity-100" />
                  {link.platform}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
