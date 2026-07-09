import { AppHeader } from "@/components/AppHeader";
import { getAboutProfile } from "@/lib/about";
import Link from "next/link";
import { Globe, MapPin, ExternalLink, Calendar, GraduationCap, Briefcase, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const profile = await getAboutProfile();

  if (!profile.is_public) {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader />
        <section className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center px-4 py-10">
          <p className="text-lg text-text-secondary">This profile is currently private.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <AppHeader />
      
      {/* Hero Section */}
      <section className="relative w-full">
        {profile.cover_image_url && (
          <div className="absolute inset-0 h-[40vh] w-full overflow-hidden opacity-50 sm:h-[50vh]">
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
            <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        
        <div className="relative mx-auto mt-16 flex w-full max-w-[1024px] flex-col items-center gap-8 px-4 sm:mt-24 sm:px-8 md:flex-row md:items-start md:gap-16">
          <div className="shrink-0">
            {profile.profile_image_url ? (
              <div className="h-48 w-48 overflow-hidden rounded-[2rem] shadow-2xl shadow-black/20 sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-[400px] lg:w-[320px]">
                <img src={profile.profile_image_url} alt={profile.display_name ?? ""} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-[2rem] bg-surface-secondary shadow-xl sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-[400px] lg:w-[320px]">
                <span className="text-4xl text-text-secondary">No Image</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center text-center md:items-start md:pt-12 md:text-left">
            {profile.tagline && (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                {profile.tagline}
              </p>
            )}
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              {profile.display_name}
            </h1>
            <h2 className="mt-4 text-lg text-text-secondary sm:text-xl">
              {profile.professional_title}
            </h2>
            
            {(profile.location || profile.nationality) && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-text-secondary md:justify-start">
                {profile.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {profile.location}
                  </span>
                )}
                {profile.nationality && (
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> {profile.nationality}
                  </span>
                )}
              </div>
            )}
            
            <div className="mt-8 flex flex-wrap gap-4">
              {profile.primary_cta_href && (
                <Link
                  href={profile.primary_cta_href}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {profile.primary_cta_label || "View Portfolio"}
                </Link>
              )}
              {profile.secondary_cta_href && (
                <Link
                  href={profile.secondary_cta_href}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-8 text-sm font-semibold text-text-primary transition-all hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <section className="mx-auto mt-20 w-full max-w-[800px] px-4 sm:mt-32 sm:px-8">
          <h3 className="text-2xl font-semibold text-text-primary">Biography</h3>
          <div className="mt-6 space-y-6 text-base leading-relaxed text-text-secondary sm:text-lg sm:leading-loose">
            {profile.full_bio ? (
              profile.full_bio.split("\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))
            ) : (
              <p>{profile.short_bio}</p>
            )}
          </div>
        </section>
      )}

      {/* Quote */}
      {profile.quote && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="relative rounded-[2rem] bg-surface/50 p-8 text-center sm:p-16">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-8xl text-border/50">"</span>
            <p className="relative z-10 mx-auto max-w-[800px] text-2xl font-medium italic leading-relaxed text-text-primary sm:text-4xl sm:leading-snug">
              {profile.quote}
            </p>
          </div>
        </section>
      )}

      {/* Metrics */}
      {profile.personal_metrics && Object.values(profile.personal_metrics).some(v => v) && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <h3 className="text-2xl font-semibold text-text-primary">Profile Metrics</h3>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Object.entries(profile.personal_metrics).map(([key, value]) => {
              if (!value) return null;
              const label = key.replace(/_/g, " ");
              return (
                <div key={key} className="rounded-[1.4rem] border border-border bg-surface/40 p-5 text-center transition-all hover:bg-surface/80">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-medium text-text-primary">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills & Languages Row */}
      {(profile.skills?.length > 0 || profile.languages?.length > 0) && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="grid gap-16 md:grid-cols-2 md:gap-8">
            {profile.skills?.length > 0 && (
              <div>
                <h3 className="text-2xl font-semibold text-text-primary">Skills & Expertise</h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="rounded-full bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.languages?.length > 0 && (
              <div>
                <h3 className="text-2xl font-semibold text-text-primary">Languages</h3>
                <div className="mt-6 space-y-4">
                  {profile.languages.map((lang, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border pb-4">
                      <span className="font-medium text-text-primary">{lang.language}</span>
                      <span className="text-sm text-text-secondary">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Timeline (Education & Career) */}
      {(profile.education?.length > 0 || profile.career?.length > 0) && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="grid gap-16 md:grid-cols-2 md:gap-8">
            {profile.career?.length > 0 && (
              <div>
                <h3 className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
                  <Briefcase className="h-6 w-6 text-accent" />
                  Career
                </h3>
                <div className="mt-8 space-y-8">
                  {profile.career.map((item, index) => (
                    <div key={index} className="relative pl-6">
                      <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-accent" />
                      {index !== profile.career.length - 1 && (
                        <div className="absolute bottom-[-2rem] left-[0.2rem] top-6 w-[2px] bg-border" />
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        {item.period}
                      </p>
                      <h4 className="mt-1 text-lg font-medium text-text-primary">
                        {item.role}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {item.company}
                      </p>
                      {item.description && (
                        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
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
                <h3 className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
                  <GraduationCap className="h-6 w-6 text-accent" />
                  Education
                </h3>
                <div className="mt-8 space-y-8">
                  {profile.education.map((item, index) => (
                    <div key={index} className="relative pl-6">
                      <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-accent" />
                      {index !== profile.education.length - 1 && (
                        <div className="absolute bottom-[-2rem] left-[0.2rem] top-6 w-[2px] bg-border" />
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        {item.period}
                      </p>
                      <h4 className="mt-1 text-lg font-medium text-text-primary">
                        {item.program}
                      </h4>
                      <p className="text-sm text-text-secondary">
                        {item.school}
                      </p>
                      {item.description && (
                        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
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
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <h3 className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
            <Award className="h-6 w-6 text-accent" />
            Awards & Recognition
          </h3>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.achievements.map((item, index) => (
              <div key={index} className="rounded-2xl border border-border bg-surface p-6 transition-all hover:shadow-lg">
                <span className="text-xs font-bold text-accent">{item.year}</span>
                <h4 className="mt-2 text-lg font-semibold text-text-primary">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hobbies & Personal Info */}
      {(profile.hobbies?.length > 0 || profile.personality_traits?.length > 0) && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 sm:px-8">
          <div className="grid gap-16 md:grid-cols-2 md:gap-8">
            {profile.hobbies?.length > 0 && (
              <div>
                <h3 className="text-2xl font-semibold text-text-primary">Interests & Hobbies</h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby, i) => (
                    <span key={i} className="rounded-full bg-background px-4 py-2 text-sm text-text-primary border border-border">
                      {hobby.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.personality_traits?.length > 0 && (
              <div>
                <h3 className="text-2xl font-semibold text-text-primary">Personality</h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.personality_traits.map((trait, i) => (
                    <span key={i} className="rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Social Links */}
      {profile.social_links?.length > 0 && (
        <section className="mx-auto mt-24 w-full max-w-[1024px] px-4 text-center sm:px-8">
          <h3 className="text-2xl font-semibold text-text-primary">Connect</h3>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {profile.social_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-text-primary transition hover:bg-background"
              >
                <ExternalLink className="h-4 w-4" />
                {link.platform}
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
