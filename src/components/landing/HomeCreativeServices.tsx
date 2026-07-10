import { ArrowRight } from "lucide-react";
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
      <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-32">
          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary mb-4 block">Services</span>
          <h2 className="font-serif text-4xl font-normal text-text-primary sm:text-5xl lg:text-[3.5rem] leading-[1.1] mb-6">
            Creative<br />Collaborations
          </h2>
          <p className="text-[0.95rem] leading-[1.8] text-text-secondary font-light max-w-[360px] mb-10">
            A selective approach to creative partnerships. Specializing in visual narratives that blend modern luxury with nature-inspired aesthetics.
          </p>
          <Link href="/about" className="inline-flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em] font-medium border-b border-text-primary/40 pb-1.5 hover:border-text-primary transition-colors duration-200">
            About the Studio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="lg:col-span-7 flex flex-col w-full border-t border-border/40">
          {services.map((svc, idx) => (
            <div key={idx} className="group flex flex-col sm:flex-row sm:items-start justify-between py-10 md:py-12 border-b border-border/40 gap-6 transition-colors duration-500 hover:bg-surface-secondary/20 px-4 -mx-4 rounded-2xl">
              <div className="flex items-start gap-6">
                 <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary/50 font-medium pt-1.5">
                   0{idx + 1}
                 </span>
                 <div>
                   <h3 className="font-serif text-2xl text-text-primary mb-3 group-hover:text-accent transition-colors duration-300">
                     {svc.title}
                   </h3>
                   <p className="text-[0.9rem] leading-relaxed text-text-secondary font-light max-w-[320px]">
                     {svc.desc}
                   </p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
