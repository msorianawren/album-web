"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PublicEnvironmentCanvas } from "../PublicEnvironmentCanvas";
import type { EnvironmentPresetId, EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentPhase } from "@/lib/environment/phase";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import { getEnvironmentState } from "@/lib/environment/presets";

export function EnvironmentReviewLab() {
  const [preset, setPreset] = useState<EnvironmentPresetId>("sakura");
  const [phase, setPhase] = useState<EnvironmentPhase>("day");
  const [tier, setTier] = useState<"full" | "reduced" | "off">("full");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [darkBackground, setDarkBackground] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [fps, setFps] = useState(0);

  const preferences: EnvironmentPreferences = {
    preset: preset,
    phase: phase,
    brightness: 100,
    chimeVolume: 50,
    spatialDepth: 50,
    environmentDensity: 50,
    branchSway: 50,
  };

  const quality: EnvironmentQuality = {
    enabled: tier !== "off",
    tier: tier === "off" ? "reduced" : tier,
    shadows: showShadows && tier === "full",
    particles: showParticles,
    chimeCap: 4,
    birdCap: 5,
    particleCap: 100,
    dpr: [1, 2],
  };

  const state = getEnvironmentState(preset, phase);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rAF: number;
    const updateFps = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      rAF = requestAnimationFrame(updateFps);
    };
    rAF = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(rAF);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      {/* Background Hero */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${darkBackground ? "opacity-30" : "opacity-100"}`}>
        <Image
          src="/images/hero-background.jpg" // Assuming there's a default background image to test with
          alt="Hero Background"
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Safe Zones Overlay */}
      {showSafeZones && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Mock Safe Zones */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 border-2 border-red-500 bg-red-500/20 rounded-full flex items-center justify-center">
            Face Safe Zone
          </div>
          <div className="absolute top-10 left-10 w-48 h-16 border-2 border-yellow-500 bg-yellow-500/20 flex items-center justify-center">
            Header Safe Zone
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 h-32 border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center">
            Title / CTA Safe Zone
          </div>
          <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-purple-500 bg-purple-500/20 rounded-full flex items-center justify-center">
            Ask Oriana
          </div>
        </div>
      )}

      {/* Environment Canvas */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {quality.enabled && (
          <PublicEnvironmentCanvas
            rects={[]}
            reducedMotion={reducedMotion}
            state={state}
            preferences={preferences}
            quality={quality}
            active={true}
            onUnavailable={() => console.error("WebGL Unavailable")}
          />
        )}
      </div>

      {/* Dev Controls */}
      <div className="absolute top-4 right-4 bg-black/80 p-4 rounded-xl shadow-2xl z-[100] w-80 text-sm backdrop-blur border border-white/10 flex flex-col gap-4">
        <h2 className="font-bold text-lg text-amber-400">Environment Review Lab</h2>
        
        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span>FPS: <strong className="text-white">{fps}</strong></span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-zinc-500">Preset</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-white">
            <option value="sakura">Sakura Garden</option>
            <option value="fireflies">Fireflies</option>
            <option value="snow">Snow</option>
            <option value="autumn">Autumn</option>
            <option value="mist">Mist</option>
            <option value="rain">Rain</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-zinc-500">Phase</label>
          <div className="flex gap-2">
            {(["day", "sunset", "night"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`flex-1 py-1 rounded border ${phase === p ? "bg-amber-600 border-amber-500" : "bg-zinc-800 border-zinc-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-zinc-500">Quality Tier</label>
          <div className="flex gap-2">
            {(["full", "reduced", "off"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`flex-1 py-1 rounded border ${tier === t ? "bg-blue-600 border-blue-500" : "bg-zinc-800 border-zinc-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} />
            <span>Simulate Reduced Motion</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showSafeZones} onChange={e => setShowSafeZones(e.target.checked)} />
            <span>Show Safe Zones</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={darkBackground} onChange={e => setDarkBackground(e.target.checked)} />
            <span>Darken Background (Debug)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showParticles} onChange={e => setShowParticles(e.target.checked)} />
            <span>Enable Particles</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showShadows} onChange={e => setShowShadows(e.target.checked)} />
            <span>Enable Shadows</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => {
              setTier("full");
              setReducedMotion(false);
              setShowParticles(true);
              setShowShadows(true);
            }}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded p-1 text-xs"
          >
            Desktop Full
          </button>
          <button
            onClick={() => {
              setTier("reduced");
              setReducedMotion(false);
              setShowParticles(false);
              setShowShadows(false);
            }}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded p-1 text-xs"
          >
            Mobile Reduced
          </button>
        </div>
      </div>
    </div>
  );
}
