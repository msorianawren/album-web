"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { AboutProfile, LandingPageContent } from "@/lib/types";
import Link from "next/link";
import { Globe, MapPin, ExternalLink, GraduationCap, Briefcase, Award } from "lucide-react";

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
    if (prefersReducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from(".hero-element", {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
      });

      // Section reveal animations
      const sections = gsap.utils.toArray<HTMLElement>(".reveal-section");
      sections.forEach((section) => {
        gsap.from(section, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });
      
      // Stagger items inside lists/grids
      const staggerContainers = gsap.utils.toArray<HTMLElement>(".stagger-container");
      staggerContainers.forEach((container) => {
        gsap.from(container.children, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className="relative z-10 min-h-screen bg-transparent pb-32">
      
      {/* Hero Section */}
      <section className="relative w-full">
        {profile.cover_image_url && (
          <div className="absolute inset-0 h-[55vh] w-full overflow-hidden opacity-50 sm:h-[65vh]">
            <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/40 to-background z-10" />
            <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover hero-element mix-blend-overlay" />
          </div>
        )}
        
        <div className="relative z-20 mx-auto mt-20 flex w-full max-w-[1100px] flex-col items-center gap-10 px-4 sm:mt-32 sm:px-8 md:flex-row md:items-end md:gap-16">
          <div className="shrink-0 hero-element relative group">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-surface/20 to-transparent blur-xl transition-all duration-700 group-hover:from-accent/20" />
            {profile.profile_image_url ? (
              <div className="relative h-56 w-56 overflow-hidden rounded-[2rem] border border-[var(--glass-border)] shadow-2xl shadow-black/30 sm:h-72 sm:w-72 md:h-96 md:w-80 lg:h-[450px] lg:w-[350px]">
                <img src={profile.profile_image_url} alt={profile.display_name ?? ""} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            ) : (
              <div className="relative flex h-56 w-56 overflow-hidden items-center justify-center rounded-[2rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md shadow-2xl sm:h-72 sm:w-72 md:h-96 md:w-80 lg:h-[450px] lg:w-[350px]">
                <div className="absolute inset-0 bg-gradient-to-br from-surface/30 to-surface-secondary/30" />
                <div className="relative flex flex-col items-center gap-4 text-center px-6">
                  <span className="font-serif text-5xl font-light italic text-text-secondary sm:text-6xl">
                    {profile.display_name?.[0]?.toUpperCase() || "O"}
                  </span>
                  <div className="h-px w-8 bg-border" />
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary">Visual Identity</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center text-center md:items-start md:pb-8 md:text-left">
            <div className="hero-element flex flex-wrap justify-center gap-3 md:justify-start">
              {profile.tagline && (
                <span className="rounded-full border border-border bg-surface/50 backdrop-blur-sm px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
                  {profile.tagline}
                </span>
              )}
              {profile.nationality && (
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 backdrop-blur-sm px-3 py-1 text-[0.7rem] font-medium text-text-secondary">
                  <Globe className="h-3 w-3" /> {profile.nationality}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface/50 backdrop-blur-sm px-3 py-1 text-[0.7rem] font-medium text-text-secondary">
                  <MapPin className="h-3 w-3" /> {profile.location}
                </span>
              )}
            </div>
            
            <h1 className="hero-element mt-6 font-serif text-5xl font-medium tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              {profile.display_name}
            </h1>
            <h2 className="hero-element mt-4 text-xl font-light text-text-secondary sm:text-2xl">
              {profile.professional_title}
            </h2>
            
            <div className="hero-element mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
              {profile.primary_cta_href && (
                <Link
                  href={profile.primary_cta_href}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-[0.8rem] font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_var(--preset-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {profile.primary_cta_label || "View Portfolio"}
                </Link>
              )}
              {profile.secondary_cta_href && (
                <Link
                  href={profile.secondary_cta_href}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md px-8 text-[0.8rem] font-semibold uppercase tracking-wider text-text-primary transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {profile.secondary_cta_label || "Contact"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Biography */}
      {(profile.short_bio || profile.full_bio) && (
        <section className="reveal-section mx-auto mt-24 w-full max-w-[1024px] px-4 sm:mt-40 sm:px-8">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4">
              <h3 className="font-serif text-3xl font-medium text-text-primary">Biography</h3>
              <div className="mt-6 h-px w-16 bg-accent" />
            </div>
            <div className="md:col-span-8">
              <div className="space-y-6 text-base font-light leading-relaxed text-text-secondary sm:text-lg sm:leading-loose">
                {profile.full_bio ? (
                  profile.full_bio.split("\n").filter(Boolean).map((para, i) => (
                    <p key={i} className="first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-serif first-letter:text-accent">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-serif first-letter:text-accent">
                    {profile.short_bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quote */}
      {profile.quote && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[900px] px-4 sm:px-8">
          <div className="relative rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-12 text-center backdrop-blur-md sm:p-20 shadow-2xl shadow-black/5">
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-serif text-8xl text-accent/20">"</span>
            <p className="relative z-10 mx-auto font-serif text-2xl font-light italic leading-relaxed text-text-primary sm:text-4xl sm:leading-snug">
              {profile.quote}
            </p>
            <div className="mx-auto mt-8 h-px w-24 bg-border" />
          </div>
        </section>
      )}

      {/* Metrics */}
      {profile.personal_metrics && Object.values(profile.personal_metrics).some(v => v) && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="mb-12 flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-serif text-2xl font-medium text-text-primary">Measurements & Details</h3>
          </div>
          <div className="stagger-container grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {Object.entries(profile.personal_metrics).map(([key, value]) => {
              if (!value) return null;
              const label = key.replace(/_/g, " ");
              return (
                <div key={key} className="group flex flex-col items-center justify-center rounded-[1.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 text-center backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-accent/50 hover:bg-surface hover:shadow-xl">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-secondary group-hover:text-accent transition-colors">
                    {label}
                  </p>
                  <p className="mt-3 font-serif text-2xl font-light text-text-primary">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills & Languages Row */}
      {(profile.skills?.length > 0 || profile.languages?.length > 0 || profile.hobbies?.length > 0 || profile.personality_traits?.length > 0) && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="grid gap-16 md:grid-cols-2 md:gap-12">
            
            <div className="flex flex-col gap-16">
              {profile.skills?.length > 0 && (
                <div>
                  <h3 className="mb-6 font-serif text-2xl font-medium text-text-primary">Expertise</h3>
                  <div className="stagger-container flex flex-wrap gap-3">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="rounded-full border border-border bg-surface/40 px-5 py-2.5 text-[0.8rem] text-text-primary shadow-sm backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-surface">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.personality_traits?.length > 0 && (
                <div>
                  <h3 className="mb-6 font-serif text-2xl font-medium text-text-primary">Personality</h3>
                  <div className="stagger-container flex flex-wrap gap-3">
                    {profile.personality_traits.map((trait, i) => (
                      <span key={i} className="rounded-full bg-accent/10 px-5 py-2.5 text-[0.8rem] font-medium text-accent transition-all hover:bg-accent/20">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-16">
              {profile.languages?.length > 0 && (
                <div>
                  <h3 className="mb-6 font-serif text-2xl font-medium text-text-primary">Languages</h3>
                  <div className="stagger-container space-y-4 rounded-[2rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-8 backdrop-blur-md shadow-xl shadow-black/5">
                    {profile.languages.map((lang, i) => (
                      <div key={i} className="group flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <span className="font-medium text-text-primary transition-colors group-hover:text-accent">{lang.language}</span>
                        <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs text-text-secondary">{lang.proficiency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {profile.hobbies?.length > 0 && (
                <div>
                  <h3 className="mb-6 font-serif text-2xl font-medium text-text-primary">Interests</h3>
                  <div className="stagger-container flex flex-wrap gap-3">
                    {profile.hobbies.map((hobby, i) => (
                      <span key={i} className="flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-2 text-[0.8rem] text-text-secondary transition-all hover:border-text-secondary">
                        <span className="h-1.5 w-1.5 rounded-full bg-border" />
                        {hobby.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>
      )}

      {/* Timeline (Career & Education) */}
      {(profile.education?.length > 0 || profile.career?.length > 0) && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="grid gap-16 md:grid-cols-2 md:gap-12">
            {profile.career?.length > 0 && (
              <div>
                <div className="mb-10 flex items-center gap-4 border-b border-border pb-4">
                  <Briefcase className="h-6 w-6 text-accent" />
                  <h3 className="font-serif text-2xl font-medium text-text-primary">Experience</h3>
                </div>
                <div className="stagger-container space-y-10">
                  {profile.career.map((item, index) => (
                    <div key={index} className="group relative pl-8">
                      <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-background transition-transform group-hover:scale-125" />
                      {index !== profile.career.length - 1 && (
                        <div className="absolute bottom-[-2.5rem] left-[0.32rem] top-6 w-px bg-border/50" />
                      )}
                      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-accent">
                        {item.period}
                      </p>
                      <h4 className="mt-2 text-lg font-medium text-text-primary">
                        {item.role}
                      </h4>
                      <p className="mt-1 text-sm font-medium text-text-secondary">
                        {item.company}
                      </p>
                      {item.description && (
                        <p className="mt-4 text-sm font-light leading-relaxed text-text-secondary">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {profile.education?.length > 0 && (
              <div>
                <div className="mb-10 flex items-center gap-4 border-b border-border pb-4">
                  <GraduationCap className="h-6 w-6 text-accent" />
                  <h3 className="font-serif text-2xl font-medium text-text-primary">Education</h3>
                </div>
                <div className="stagger-container space-y-10">
                  {profile.education.map((item, index) => (
                    <div key={index} className="group relative pl-8">
                      <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-background transition-transform group-hover:scale-125" />
                      {index !== profile.education.length - 1 && (
                        <div className="absolute bottom-[-2.5rem] left-[0.32rem] top-6 w-px bg-border/50" />
                      )}
                      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-accent">
                        {item.period}
                      </p>
                      <h4 className="mt-2 text-lg font-medium text-text-primary">
                        {item.program}
                      </h4>
                      <p className="mt-1 text-sm font-medium text-text-secondary">
                        {item.school}
                      </p>
                      {item.description && (
                        <p className="mt-4 text-sm font-light leading-relaxed text-text-secondary">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Achievements */}
      {profile.achievements?.length > 0 && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="mb-10 flex items-center justify-center gap-4 text-center">
            <Award className="h-8 w-8 text-accent" />
            <h3 className="font-serif text-3xl font-medium text-text-primary">Recognition</h3>
          </div>
          <div className="stagger-container mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.achievements.map((item, index) => (
              <div key={index} className="group flex flex-col rounded-[2rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-8 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-accent/40 hover:shadow-2xl">
                <span className="inline-flex w-fit items-center rounded-full bg-surface-secondary px-3 py-1 text-[0.7rem] font-bold text-accent">
                  {item.year}
                </span>
                <h4 className="mt-5 font-serif text-xl font-medium text-text-primary group-hover:text-accent transition-colors">{item.title}</h4>
                <p className="mt-4 text-sm font-light leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Social Links */}
      {profile.social_links?.length > 0 && (
        <section className="reveal-section mx-auto mt-32 w-full max-w-[1024px] px-4 text-center sm:px-8">
          <h3 className="font-serif text-3xl font-medium text-text-primary">Connect</h3>
          <div className="mt-4 flex items-center justify-center">
            <div className="h-px w-16 bg-accent" />
          </div>
          <div className="stagger-container mt-10 flex flex-wrap justify-center gap-4">
            {profile.social_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-8 py-4 text-sm font-medium text-text-primary backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-surface hover:shadow-[0_0_15px_var(--preset-glow)]"
              >
                <ExternalLink className="h-4 w-4 text-text-secondary group-hover:text-accent transition-colors" />
                {link.platform}
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
