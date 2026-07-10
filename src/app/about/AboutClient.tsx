"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { AboutProfile } from "@/lib/types";
import Link from "next/link";
import { Globe, MapPin, ExternalLink, ArrowRight } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface AboutClientProps {
  profile: AboutProfile;
}

export function AboutClient({ profile }: AboutClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.globalTimeline.timeScale(20);
    }
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(".hero-fade", { opacity: 0, y: 30 });
      gsap.set(".hero-image", { opacity: 0, scale: 0.95 });
      gsap.set(".reveal-text", { opacity: 0, y: 40 });
      gsap.set(".reveal-line", { scaleX: 0, transformOrigin: "left" });
      gsap.set(".stagger-fade > *", { opacity: 0, y: 20 });

      // Hero Timeline
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to(".hero-image", { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out" })
        .to(".hero-fade", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.8");

      // Scroll reveals
      const revealTexts = gsap.utils.toArray<HTMLElement>(".reveal-text");
      revealTexts.forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        });
      });

      const revealLines = gsap.utils.toArray<HTMLElement>(".reveal-line");
      revealLines.forEach((el) => {
        gsap.to(el, {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        });
      });

      const staggerContainers = gsap.utils.toArray<HTMLElement>(".stagger-fade");
      staggerContainers.forEach((container) => {
        gsap.to(container.children, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 85%",
            once: true,
          },
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className="relative z-10 bg-background text-text-primary selection:bg-accent/20">
      
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative min-h-[90vh] w-full overflow-hidden flex flex-col justify-end pt-32 pb-12 sm:pb-20">
        
        {/* Massive Cover Background (Right Aligned) */}
        {profile.cover_image_url && (
          <div className="absolute top-0 right-0 h-full w-full md:w-[75%] lg:w-[65%] origin-right">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-full" />
            <img src={profile.cover_image_url} alt="" className="hero-image h-full w-full object-cover object-center opacity-80 mix-blend-overlay" />
          </div>
        )}

        <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 h-full flex flex-col justify-between">
          
          {/* Top Info Bar */}
          <div className="hero-fade flex flex-wrap items-start justify-between w-full md:w-[40%] gap-6 mb-20 md:mb-0">
            <div className="flex flex-col gap-3">
              {profile.tagline && (
                <span className="text-xs uppercase tracking-[0.25em] text-text-secondary font-medium">
                  {profile.tagline}
                </span>
              )}
              {profile.professional_title && (
                <span className="text-lg font-serif italic text-text-primary">
                  {profile.professional_title}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-2 text-right md:text-left text-xs uppercase tracking-widest text-text-secondary">
              {profile.location && <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {profile.location}</span>}
              {profile.nationality && <span className="flex items-center gap-2"><Globe className="h-3 w-3" /> {profile.nationality}</span>}
            </div>
          </div>

          {/* Massive Display Name & Portrait */}
          <div className="relative mt-auto w-full flex flex-col md:flex-row items-end justify-between gap-12">
            
            <div className="relative z-30">
              <h1 className="hero-fade font-serif text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-normal tracking-tighter leading-[0.85] text-text-primary mix-blend-difference">
                {profile.display_name?.split(" ").map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </h1>
              
              <div className="hero-fade mt-10 flex gap-6">
                {profile.primary_cta_href && (
                  <Link href={profile.primary_cta_href} className="group flex items-center gap-3 text-sm uppercase tracking-widest border-b border-text-primary pb-1 transition-all hover:pr-4">
                    {profile.primary_cta_label || "View Portfolio"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </Link>
                )}
              </div>
            </div>

            {/* Overlapping Portrait */}
            {profile.profile_image_url && (
              <div className="hero-image relative z-20 shrink-0 w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[480px] aspect-[3/4] overflow-hidden bg-surface shadow-2xl shadow-black/10">
                <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>


      {/* 2. BIOGRAPHY (2-Column Magazine Layout) */}
      {(profile.short_bio || profile.full_bio) && (
        <section className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 mt-32 md:mt-48">
          <div className="reveal-line w-full h-[1px] bg-border mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24">
            
            {/* Sticky Header */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="sticky top-32">
                <h3 className="reveal-text font-serif text-3xl md:text-4xl lg:text-5xl font-normal text-text-primary">
                  Biography
                </h3>
                <span className="reveal-text block mt-4 text-xs uppercase tracking-widest text-text-secondary">
                  Chapter 01
                </span>
              </div>
            </div>

            {/* Editorial Text */}
            <div className="md:col-span-8 lg:col-span-7">
              <div className="max-w-[680px] space-y-8 text-[1.125rem] font-light leading-[1.8] text-text-secondary">
                {profile.full_bio ? (
                  profile.full_bio.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i} className={`reveal-text ${i === 0 ? "first-letter:float-left first-letter:mr-4 first-letter:text-[5.5rem] first-letter:leading-[0.8] first-letter:font-serif first-letter:text-text-primary first-letter:font-normal" : ""}`}>
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="reveal-text first-letter:float-left first-letter:mr-4 first-letter:text-[5.5rem] first-letter:leading-[0.8] first-letter:font-serif first-letter:text-text-primary first-letter:font-normal">
                    {profile.short_bio}
                  </p>
                )}
              </div>
            </div>

          </div>
        </section>
      )}


      {/* 3. QUOTE (Massive Breakout) */}
      {profile.quote && (
        <section className="relative w-full px-6 sm:px-12 mt-32 md:mt-48 py-24 md:py-40 bg-surface/30">
          <div className="max-w-[1200px] mx-auto text-center flex flex-col items-center">
            <span className="reveal-text block font-serif text-accent/30 text-6xl md:text-8xl mb-6">"</span>
            <p className="reveal-text max-w-[900px] font-serif text-3xl md:text-5xl lg:text-6xl font-normal italic leading-tight text-text-primary">
              {profile.quote}
            </p>
          </div>
        </section>
      )}


      {/* 4. MEASUREMENTS & EXPERTISE */}
      <section className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 mt-32 md:mt-48">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          
          {/* Metrics Grid */}
          {profile.personal_metrics && Object.values(profile.personal_metrics).some(v => v) && (
            <div>
              <div className="reveal-line w-full h-[1px] bg-border mb-12" />
              <h3 className="reveal-text font-serif text-3xl mb-12">Measurements</h3>
              <div className="stagger-fade grid grid-cols-2 sm:grid-cols-3 gap-y-12 gap-x-8">
                {Object.entries(profile.personal_metrics).map(([key, value]) => {
                  if (!value) return null;
                  const label = key.replace(/_/g, " ");
                  return (
                    <div key={key} className="flex flex-col border-l border-border/50 pl-4">
                      <span className="text-[0.65rem] uppercase tracking-widest text-text-secondary mb-2">
                        {label}
                      </span>
                      <span className="font-serif text-xl md:text-2xl text-text-primary">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills & Traits */}
          <div className="flex flex-col gap-16">
            {profile.skills?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-12" />
                <h3 className="reveal-text font-serif text-3xl mb-8">Expertise</h3>
                <div className="stagger-fade flex flex-wrap gap-3">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="px-5 py-2 text-sm font-light border border-border/50 text-text-primary rounded-full bg-surface/10 hover:bg-surface/50 transition-colors duration-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {profile.personality_traits?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-12" />
                <h3 className="reveal-text font-serif text-3xl mb-8">Personality</h3>
                <div className="stagger-fade flex flex-wrap gap-x-8 gap-y-4">
                  {profile.personality_traits.map((trait, i) => (
                    <span key={i} className="text-lg font-serif italic text-text-secondary">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </section>


      {/* 5. TIMELINE (Career & Education) */}
      {(profile.career?.length > 0 || profile.education?.length > 0) && (
        <section className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 mt-32 md:mt-48">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-32">
            
            {profile.career?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-16" />
                <h3 className="reveal-text font-serif text-4xl mb-16">Experience</h3>
                <div className="stagger-fade space-y-16">
                  {profile.career.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-6 group">
                      <span className="text-[0.75rem] font-medium uppercase tracking-widest text-text-secondary pt-1">
                        {item.period}
                      </span>
                      <div className="flex flex-col pb-16 border-b border-border/30 sm:border-b-0 group-last:border-0 group-last:pb-0">
                        <h4 className="font-serif text-2xl text-text-primary mb-2">
                          {item.role}
                        </h4>
                        <span className="text-sm uppercase tracking-widest text-text-secondary mb-4">
                          {item.company}
                        </span>
                        {item.description && (
                          <p className="text-base font-light leading-relaxed text-text-secondary">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.education?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-16" />
                <h3 className="reveal-text font-serif text-4xl mb-16">Education</h3>
                <div className="stagger-fade space-y-16">
                  {profile.education.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-6 group">
                      <span className="text-[0.75rem] font-medium uppercase tracking-widest text-text-secondary pt-1">
                        {item.period}
                      </span>
                      <div className="flex flex-col pb-16 border-b border-border/30 sm:border-b-0 group-last:border-0 group-last:pb-0">
                        <h4 className="font-serif text-2xl text-text-primary mb-2">
                          {item.program}
                        </h4>
                        <span className="text-sm uppercase tracking-widest text-text-secondary mb-4">
                          {item.school}
                        </span>
                        {item.description && (
                          <p className="text-base font-light leading-relaxed text-text-secondary">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}


      {/* 6. LANGUAGES & RECOGNITION */}
      {(profile.languages?.length > 0 || profile.achievements?.length > 0) && (
        <section className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 mt-32 md:mt-48">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-32">
            
            {profile.languages?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-12" />
                <h3 className="reveal-text font-serif text-3xl mb-12">Languages</h3>
                <div className="stagger-fade flex flex-col w-full">
                  {profile.languages.map((lang, i) => (
                    <div key={i} className="flex items-center justify-between py-6 border-b border-border/50">
                      <span className="font-serif text-2xl text-text-primary">{lang.language}</span>
                      <span className="text-xs uppercase tracking-widest text-text-secondary">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.achievements?.length > 0 && (
              <div>
                <div className="reveal-line w-full h-[1px] bg-border mb-12" />
                <h3 className="reveal-text font-serif text-3xl mb-12">Recognition</h3>
                <div className="stagger-fade space-y-12">
                  {profile.achievements.map((item, index) => (
                    <div key={index} className="flex flex-col group border-l border-border/50 pl-6 hover:border-text-primary transition-colors duration-300">
                      <span className="text-xs uppercase tracking-widest text-text-secondary mb-3">
                        {item.year}
                      </span>
                      <h4 className="font-serif text-2xl text-text-primary mb-3">
                        {item.title}
                      </h4>
                      <p className="text-base font-light leading-relaxed text-text-secondary">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}


      {/* 7. CONNECT (Footer Area) */}
      {profile.social_links?.length > 0 && (
        <section className="relative w-full mt-32 md:mt-48 pb-32">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-12 md:px-20 text-center">
            <h3 className="reveal-text font-serif text-[3rem] md:text-[5rem] lg:text-[7rem] font-normal tracking-tight text-text-primary opacity-20">
              Connect
            </h3>
            <div className="stagger-fade mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6">
              {profile.social_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 text-sm uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors duration-300 border-b border-transparent hover:border-text-primary pb-1"
                >
                  {link.platform} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
