import Link from "next/link";

export function HomeCreativeServices() {
  const services = [
    { title: "Editorial Modeling", desc: "Collaborating on high-fashion and conceptual editorials." },
    { title: "Beauty Direction", desc: "Crafting distinct visual identities through makeup and styling." },
    { title: "Campaign Concepts", desc: "Translating brand narratives into cinematic photography." },
    { title: "Visual Storytelling", desc: "Private commissions and intimate portrait sessions." },
  ];

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="mb-12">
        <h2 className="font-serif text-3xl font-light text-text-primary sm:text-4xl text-center">
          Collaborations
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((svc, idx) => (
          <div key={idx} className="group flex flex-col justify-between rounded-[1.4rem] border border-border bg-surface/50 p-8 transition duration-500 hover:bg-surface hover:shadow-xl">
            <div>
              <h3 className="font-serif text-xl font-medium text-text-primary">
                {svc.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                {svc.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-16 text-center">
        <Link href="/contact" className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-medium uppercase tracking-[0.14em] text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Work with me
        </Link>
      </div>
    </section>
  );
}
