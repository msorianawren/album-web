"use client";

import { Leaf, Volume2, VolumeX, BookOpen, Clock, ShieldCheck, HeartHandshake, EyeOff } from "lucide-react";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import { useUIPreferences } from "@/hooks/useUIPreferences";

export default function ProfileAndGuidelinesPage() {
  const { memory, isClient } = useAlbumViewMemory();
  const { soundEnabled, setSoundEnabled } = useUIPreferences();

  const viewedCount = Object.keys(memory).length;

  return (
    <main className="min-h-screen bg-background text-text-primary px-5 py-24 pb-32">
      <div className="mx-auto max-w-3xl grid gap-16">
        
        {/* Header */}
        <section className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary mb-3">
            Your Sanctuary
          </p>
          <h1 className="text-4xl font-serif italic text-text-primary">
            Profile & Preferences
          </h1>
          <p className="mt-4 text-text-secondary leading-relaxed max-w-lg mx-auto">
            A quiet space to view your reading memory and tailor your sensory experience. 
            Everything here is private and stored only on your device.
          </p>
        </section>

        {/* User State & Settings */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Memory Card */}
          <div className="rounded-[1.4rem] border border-border bg-surface/60 backdrop-blur-xl p-6 shadow-xl shadow-text-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-muted-accent" />
                Reading Memory
              </h2>
            </div>
            {isClient ? (
              <div className="flex items-end gap-3">
                <span className="text-4xl font-serif text-text-primary">{viewedCount}</span>
                <span className="text-sm text-text-secondary pb-1">albums viewed</span>
              </div>
            ) : (
              <div className="h-10 animate-pulse bg-background/50 rounded-lg w-1/3" />
            )}
            <p className="mt-4 text-xs text-text-secondary leading-relaxed">
              We remember where you left off so you can seamlessly return to the art. This memory is cleared if you wipe your browser data.
            </p>
          </div>

          {/* Preferences Card */}
          <div className="rounded-[1.4rem] border border-border bg-surface/60 backdrop-blur-xl p-6 shadow-xl shadow-text-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Leaf className="w-5 h-5 text-muted-accent" />
                Sensory
              </h2>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="relative h-7 w-12 rounded-full border border-border bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle sound effects"
              >
                <span 
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-text-primary transition-transform duration-300 flex items-center justify-center ${soundEnabled ? "translate-x-5" : "translate-x-0"}`} 
                >
                  {soundEnabled ? <Volume2 className="w-3 h-3 text-background" /> : <VolumeX className="w-3 h-3 text-background" />}
                </span>
              </button>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-xl font-medium text-text-primary">
                {soundEnabled ? "Nature Chimes" : "Silent Mode"}
              </span>
            </div>
            <p className="mt-4 text-xs text-text-secondary leading-relaxed">
              When enabled, subtle pentatonic tones will play as you navigate, bringing a tactile, organic feel to the interface.
            </p>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="rounded-[1.4rem] border border-border bg-surface/30 p-8 md:p-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-serif italic text-text-primary">
              The Code of Conduct
            </h2>
            <div className="h-px w-12 bg-border mx-auto mt-4" />
          </div>

          <div className="grid gap-8">
            <article className="flex gap-4 items-start">
              <HeartHandshake className="w-6 h-6 text-muted-accent shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-2">Respect the Art</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  This platform is a curated archive of editorial and cinematic moments. We encourage you to immerse yourself deeply in the visual storytelling. Take your time, appreciate the light, and leave thoughtful comments if you feel inspired.
                </p>
              </div>
            </article>

            <article className="flex gap-4 items-start">
              <ShieldCheck className="w-6 h-6 text-muted-accent shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-2">A Safe Harbor</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Constructive critique and admiration are always welcome. However, any form of harassment, explicit demands, or disrespectful behavior will result in an immediate and permanent loss of access. This space remains a safe harbor for the artist and its genuine patrons.
                </p>
              </div>
            </article>

            <article className="flex gap-4 items-start">
              <EyeOff className="w-6 h-6 text-muted-accent shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-2">Privacy & Boundaries</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Private albums and exclusive collections are shared with trust. Redistributing, scraping, or sharing access to private material without consent directly violates our core principles. We protect our community's privacy fiercely.
                </p>
              </div>
            </article>
            
            <article className="flex gap-4 items-start">
              <Clock className="w-6 h-6 text-muted-accent shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-text-primary mb-2">Digital Minimalism</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  We actively resist the endless-scroll culture. The design, the subtle sounds, and the memory systems are all built to encourage slow, mindful consumption. There is no rush here.
                </p>
              </div>
            </article>
          </div>
        </section>

      </div>
    </main>
  );
}
