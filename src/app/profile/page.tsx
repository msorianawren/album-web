"use client";

import { Leaf, Volume2, VolumeX, BookOpen, Clock, ShieldCheck, HeartHandshake, EyeOff, ArrowLeft, Palette, ImageIcon, RotateCcw, UploadCloud } from "lucide-react";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import { useUIPreferences, ClickSoundType, AmbientSoundType, BgThemeType } from "@/hooks/useUIPreferences";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { imageStore } from "@/lib/idb";

export default function ProfileAndGuidelinesPage() {
  const router = useRouter();
  const { memory, isClient } = useAlbumViewMemory();
  const { 
    soundEnabled, setSoundEnabled,
    clickSound, setClickSound,
    ambientSound, setAmbientSound,
    bgThemeOverride, setBgThemeOverride,
    bgCustomUrlOverride, setBgCustomUrlOverride
  } = useUIPreferences();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewedCount = Object.keys(memory).length;

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        await imageStore.set("custom_background", dataUrl);
        setBgCustomUrlOverride(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = async () => {
    await imageStore.remove("custom_background");
    setBgCustomUrlOverride(false);
  };

  return (
    <main className="min-h-screen bg-background text-text-primary px-5 py-24 pb-32">
      <div className="mx-auto max-w-3xl grid gap-16">
        
        {/* Header */}
        <section className="relative text-center">
          <button 
            onClick={() => router.back()}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

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
        <section className="grid gap-6 md:grid-cols-2">
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
            
            {soundEnabled && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Click Sound</label>
                  <select 
                    value={clickSound}
                    onChange={(e) => setClickSound(e.target.value as ClickSoundType)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-muted-accent"
                  >
                    <option value="water">Water Drop (Default)</option>
                    <option value="crystal">Crystal Glass</option>
                    <option value="wood">Wooden Tap</option>
                    <option value="chime">Wind Chime</option>
                    <option value="thud">Soft Thud</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Ambient Background</label>
                  <select 
                    value={ambientSound}
                    onChange={(e) => setAmbientSound(e.target.value as AmbientSoundType)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-muted-accent"
                  >
                    <option value="auto">Auto (Matches Theme)</option>
                    <option value="silence">Silence</option>
                    <option value="piano">Sparse Piano (Minecraft Style)</option>
                    <option value="pad">Warm Synth Pad</option>
                    <option value="drone">Deep Space Drone</option>
                    <option value="rain">Soft Rain</option>
                    <option value="harp">Pentatonic Harp</option>
                  </select>
                </div>
              </div>
            )}
            
            {!soundEnabled && (
              <p className="mt-4 text-xs text-text-secondary leading-relaxed">
                Silent Mode is active. Turn on to experience tactile click sounds and nature-inspired background ambience.
              </p>
            )}
          </div>
        </section>

        {/* Visual Theme Section */}
        <section className="rounded-[1.4rem] border border-border bg-surface/60 backdrop-blur-xl p-6 shadow-xl shadow-text-primary/5">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-muted-accent" />
            <h2 className="text-lg font-semibold">Visual Aesthetics</h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Preset Theme</label>
              <p className="text-xs text-text-secondary mb-3">Overrides the global theme chosen by the artist.</p>
              <select 
                value={bgThemeOverride}
                onChange={(e) => setBgThemeOverride(e.target.value as BgThemeType)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-muted-accent"
              >
                <option value="default">Default (Artist's Choice)</option>
                <option value="sakura">Sakura (Cherry Blossoms)</option>
                <option value="fireflies">Fireflies (Golden Glow)</option>
                <option value="snow">Winter Snow</option>
                <option value="autumn">Autumn Leaves</option>
                <option value="mist">Morning Mist</option>
                <option value="rain">Gentle Rain</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Custom Background Image</label>
              <p className="text-xs text-text-secondary mb-3">Stored locally in your browser cache.</p>
              
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*,video/mp4,video/webm" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleCustomImageUpload} 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-text-primary text-background px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                >
                  <UploadCloud className="w-4 h-4" />
                  {bgCustomUrlOverride ? "Change Custom" : "Upload Custom"}
                </button>
                
                {bgCustomUrlOverride && (
                  <button 
                    onClick={handleResetImage}
                    className="flex items-center justify-center gap-2 bg-background border border-border text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-surface"
                    aria-label="Reset to default background"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
              {bgCustomUrlOverride && (
                <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-2 font-medium">✓ Custom background active</p>
              )}
            </div>
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
