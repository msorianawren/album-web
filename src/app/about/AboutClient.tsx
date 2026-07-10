"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { AboutProfile } from "@/lib/types";
import Link from "next/link";
import { MapPin, Globe, ArrowRight, Award, ExternalLink } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface AboutClientProps {
  profile: AboutProfile;
}

export function AboutClient({ profile }: AboutClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMetrics = profile.personal_metrics && Object.values(profile.personal_metrics).some(v => v);
  const hasCareer = profile.career?.length > 0;
  const hasEducation = profile.education?.length > 0;
  const hasSkills = profile.skills?.length > 0;
  const hasTraits = profile.personality_traits?.length > 0;
  const hasHobbies = profile.hobbies?.length > 0;
  const hasLanguages = profile.languages?.length > 0;
  const hasAchievements = profile.achievements?.length > 0;
  const hasSocialLinks = profile.social_links?.length > 0;
  const hasBio = profile.short_bio || profile.full_bio;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.globalTimeline.timeScale(20);
    }
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(".about-hero-fade", { opacity: 0, y: 24 });
      gsap.set(".about-hero-img", { opacity: 0, scale: 0.97 });
      gsap.set(".about-reveal", { opacity: 0, y: 28 });
      gsap.set(".about-line", { scaleX: 0, transformOrigin: "left" });

      // Hero entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to(".about-hero-img", { opacity: 1, scale: 1, duration: 0.8 })
        .to(".about-hero-fade", { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, "-=0.5");

      // Scroll-triggered reveals
      const reveals = gsap.utils.toArray<HTMLElement>(".about-reveal");
      reveals.forEach((el) => {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      const lines = gsap.utils.toArray<HTMLElement>(".about-line");
      lines.forEach((el) => {
        gsap.to(el, {
          scaleX: 1, duration: 0.6, ease: "power2.inOut",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className="relative z-10 bg-transparent text-text-primary selection:bg-accent/20">
      
      {profile._is_demo && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-surface-secondary border-b border-border/50 py-2.5 text-center px-4 backdrop-blur-sm">
          <p className="text-[0.7rem] uppercase tracking-[0.1em] text-text-secondary font-medium">
            Preview content shown because About Profile is not fully configured yet.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 1: EDITORIAL HERO
      ═══════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] w-full overflow-hidden flex flex-col justify-end pt-28 pb-12 sm:pb-20">

        {/* Cover background — right-aligned editorial crop */}
        {(profile.cover_image_url || profile._is_demo) && (
          <div className="absolute top-0 right-0 h-full w-full md:w-[70%] lg:w-[62%]" aria-hidden="true">
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent" />
            {profile.cover_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.cover_image_url} alt="" className="about-hero-img h-full w-full object-cover" loading="eager" />
            ) : (
              <div className="about-hero-img h-full w-full bg-surface-secondary/30 flex items-center justify-center border-l border-border/10">
                <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary/30 -rotate-90">Editorial Cover Box</span>
              </div>
            )}
          </div>
        )}

        <div className="relative z-20 w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16">

          {/* Eyebrow details */}
          <div className="about-hero-fade flex flex-wrap gap-x-10 gap-y-3 mb-16 md:mb-24 text-[0.68rem] uppercase tracking-[0.2em] text-text-secondary">
            {profile.location && (
              <span className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {profile.location}</span>
            )}
            {profile.nationality && (
              <span className="flex items-center gap-2"><Globe className="h-3 w-3" /> {profile.nationality}</span>
            )}
            {profile.birthplace && (
              <span className="flex items-center gap-2">Born in {profile.birthplace}</span>
            )}
          </div>

          {/* Name + Portrait side by side */}
          <div className="flex flex-col md:flex-row items-end justify-between gap-10 md:gap-16">

            {/* Left — Name, title, CTAs */}
            <div className="flex flex-col gap-8 md:max-w-[55%]">
              <div>
                {profile.professional_title && (
                  <p className="about-hero-fade text-xs uppercase tracking-[0.22em] text-text-secondary mb-4">
                    {profile.professional_title}
                  </p>
                )}
                <h1 className="about-hero-fade font-serif text-[3.2rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[7rem] font-normal tracking-tight leading-[0.88]">
                  {profile.display_name?.split(" ").map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </h1>
              </div>

              {profile.tagline && (
                <p className="about-hero-fade font-serif text-lg sm:text-xl italic text-text-secondary max-w-[480px] leading-relaxed">
                  {profile.tagline}
                </p>
              )}

              {/* CTAs */}
              <div className="about-hero-fade flex flex-wrap gap-5 mt-2">
                {profile.primary_cta_href && (
                  <Link href={profile.primary_cta_href} className="group inline-flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em] font-medium border-b border-text-primary/40 pb-1.5 hover:border-text-primary transition-colors duration-200">
                    {profile.primary_cta_label || "View Portfolio"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                )}
                {profile.secondary_cta_href && (
                  <Link href={profile.secondary_cta_href} className="inline-flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em] font-medium text-text-secondary border-b border-border pb-1.5 hover:text-text-primary hover:border-text-primary/40 transition-colors duration-200">
                    {profile.secondary_cta_label || "Contact"}
                  </Link>
                )}
              </div>
            </div>

            {/* Right — Portrait */}
            {(profile.profile_image_url || profile._is_demo) && (
              <div className="about-hero-img shrink-0 w-full max-w-[260px] sm:max-w-[300px] md:max-w-[360px] lg:max-w-[420px] aspect-[3/4] overflow-hidden bg-surface-secondary border border-border/10 relative shadow-sm">
                {profile.profile_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.profile_image_url} alt={profile.display_name ?? "Portrait"} className="h-full w-full object-cover" loading="eager" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-20 w-20 mb-6 border border-border/20 rounded-full" />
                    <span className="text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary/40">Portrait Frame</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 2: BIOGRAPHY
      ═══════════════════════════════════════════ */}
      {hasBio && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="about-line h-px w-full bg-border mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-20">
            {/* Sticky sidebar label */}
            <div className="md:col-span-3">
              <div className="md:sticky md:top-28">
                <span className="about-reveal block text-[0.65rem] uppercase tracking-[0.25em] text-text-secondary mb-3">Chapter 01</span>
                <h2 className="about-reveal font-serif text-3xl md:text-4xl">Biography</h2>
              </div>
            </div>
            {/* Text column — 680px max per editorial rules */}
            <div className="md:col-span-8 lg:col-span-7">
              <div className="max-w-[680px] space-y-7 text-[1.08rem] leading-[1.78] text-text-secondary font-light">
                {profile.full_bio ? (
                  profile.full_bio.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i} className={`about-reveal ${i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:text-[4.5rem] first-letter:leading-[0.78] first-letter:font-serif first-letter:text-text-primary first-letter:font-normal" : ""}`}>
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="about-reveal first-letter:float-left first-letter:mr-3 first-letter:text-[4.5rem] first-letter:leading-[0.78] first-letter:font-serif first-letter:text-text-primary first-letter:font-normal">
                    {profile.short_bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 3: PULL QUOTE
      ═══════════════════════════════════════════ */}
      {profile.quote && (
        <section className="w-full px-6 sm:px-10 mt-24 md:mt-40 py-20 md:py-32">
          <div className="max-w-[1000px] mx-auto text-center">
            <span className="about-reveal block font-serif text-5xl md:text-7xl text-text-secondary/20 mb-4" aria-hidden="true">&ldquo;</span>
            <p className="about-reveal font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.8rem] italic leading-snug text-text-primary max-w-[860px] mx-auto">
              {profile.quote}
            </p>
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 4: METRICS & EXPERTISE
      ═══════════════════════════════════════════ */}
      {(hasMetrics || hasSkills || hasTraits) && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-28">

            {/* Personal metrics */}
            {hasMetrics && (
              <div>
                <div className="about-line h-px w-full bg-border mb-12" />
                <h2 className="about-reveal font-serif text-2xl md:text-3xl mb-10">Measurements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-10 gap-x-6">
                  {Object.entries(profile.personal_metrics).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <div key={key} className="about-reveal flex flex-col border-l border-border/50 pl-4">
                        <span className="text-[0.62rem] uppercase tracking-[0.2em] text-text-secondary mb-2">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="font-serif text-xl text-text-primary">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills & Traits combined */}
            <div className="flex flex-col gap-14">
              {hasSkills && (
                <div>
                  <div className="about-line h-px w-full bg-border mb-10" />
                  <h2 className="about-reveal font-serif text-2xl md:text-3xl mb-8">Expertise</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="about-reveal px-4 py-1.5 text-[0.78rem] border border-border/40 text-text-primary rounded-full hover:bg-surface/60 transition-colors duration-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasTraits && (
                <div>
                  <div className="about-line h-px w-full bg-border mb-10" />
                  <h2 className="about-reveal font-serif text-2xl md:text-3xl mb-8">Personality</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {profile.personality_traits.map((trait, i) => (
                      <span key={i} className="about-reveal font-serif text-lg italic text-text-secondary">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 5: CAREER & EDUCATION TIMELINE
      ═══════════════════════════════════════════ */}
      {(hasCareer || hasEducation) && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-28">

            {hasCareer && (
              <div>
                <div className="about-line h-px w-full bg-border mb-14" />
                <h2 className="about-reveal font-serif text-3xl md:text-4xl mb-14">Experience</h2>
                <div className="space-y-14">
                  {profile.career.map((item, index) => (
                    <div key={index} className="about-reveal grid grid-cols-1 sm:grid-cols-[90px_1fr] gap-4 group">
                      <span className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-text-secondary pt-1.5">
                        {item.period}
                      </span>
                      <div className="flex flex-col pb-14 border-b border-border/30 group-last:border-0 group-last:pb-0">
                        <h3 className="font-serif text-xl text-text-primary mb-1">{item.role}</h3>
                        <span className="text-[0.72rem] uppercase tracking-[0.15em] text-text-secondary mb-3">
                          {item.company}
                        </span>
                        {item.description && (
                          <p className="text-[0.92rem] font-light leading-relaxed text-text-secondary">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasEducation && (
              <div>
                <div className="about-line h-px w-full bg-border mb-14" />
                <h2 className="about-reveal font-serif text-3xl md:text-4xl mb-14">Education</h2>
                <div className="space-y-14">
                  {profile.education.map((item, index) => (
                    <div key={index} className="about-reveal grid grid-cols-1 sm:grid-cols-[90px_1fr] gap-4 group">
                      <span className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-text-secondary pt-1.5">
                        {item.period}
                      </span>
                      <div className="flex flex-col pb-14 border-b border-border/30 group-last:border-0 group-last:pb-0">
                        <h3 className="font-serif text-xl text-text-primary mb-1">{item.program}</h3>
                        <span className="text-[0.72rem] uppercase tracking-[0.15em] text-text-secondary mb-3">
                          {item.school}
                        </span>
                        {item.description && (
                          <p className="text-[0.92rem] font-light leading-relaxed text-text-secondary">{item.description}</p>
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


      {/* ═══════════════════════════════════════════
          SECTION 6: LANGUAGES
      ═══════════════════════════════════════════ */}
      {hasLanguages && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="max-w-[680px]">
            <div className="about-line h-px w-full bg-border mb-12" />
            <h2 className="about-reveal font-serif text-2xl md:text-3xl mb-10">Languages</h2>
            <div className="flex flex-col w-full">
              {profile.languages.map((lang, i) => (
                <div key={i} className="about-reveal flex items-center justify-between py-5 border-b border-border/40 last:border-0">
                  <span className="font-serif text-xl text-text-primary">{lang.language}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary">{lang.proficiency}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 7: ACHIEVEMENTS
      ═══════════════════════════════════════════ */}
      {hasAchievements && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="about-line h-px w-full bg-border mb-12" />
          <h2 className="about-reveal font-serif text-3xl md:text-4xl mb-12">Recognition</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {profile.achievements.map((item, index) => (
              <div key={index} className="about-reveal flex gap-5 group">
                <div className="shrink-0 mt-1">
                  <Award className="h-5 w-5 text-text-secondary/50" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2">{item.year}</span>
                  <h3 className="font-serif text-xl text-text-primary mb-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-[0.88rem] font-light leading-relaxed text-text-secondary">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 8: HOBBIES & INTERESTS
      ═══════════════════════════════════════════ */}
      {hasHobbies && (
        <section className="w-full max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 mt-24 md:mt-40">
          <div className="about-line h-px w-full bg-border mb-10" />
          <h2 className="about-reveal font-serif text-2xl md:text-3xl mb-8">Interests</h2>
          <div className="flex flex-wrap gap-2.5">
            {profile.hobbies.map((hobby, i) => (
              <span key={i} className="about-reveal px-5 py-2 text-[0.82rem] font-light border border-border/30 text-text-primary rounded-full bg-surface/5">
                {hobby.name}
              </span>
            ))}
          </div>
        </section>
      )}


      {/* ═══════════════════════════════════════════
          SECTION 9: SOCIAL & CONNECT
      ═══════════════════════════════════════════ */}
      {hasSocialLinks && (
        <section className="w-full mt-24 md:mt-40 pb-24 md:pb-32">
          <div className="max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
            <h2 className="about-reveal font-serif text-[2.5rem] md:text-[4rem] lg:text-[5rem] tracking-tight text-text-primary/15 mb-10">
              Connect
            </h2>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-5">
              {profile.social_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="about-reveal group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary hover:text-text-primary border-b border-transparent hover:border-text-primary/40 pb-1 transition-colors duration-200"
                >
                  {link.platform} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom spacing when no social links */}
      {!hasSocialLinks && <div className="h-24 md:h-32" />}
    </main>
  );
}
