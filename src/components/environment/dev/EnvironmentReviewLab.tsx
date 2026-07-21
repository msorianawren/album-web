"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PublicEnvironmentCanvas } from "../PublicEnvironmentCanvas";
import { artistEnvironmentDefaults } from "@/lib/environment/preferences";
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
  
  // Mist dev flags
  const [mistSceneFog, setMistSceneFog] = useState(true);
  const [mistFarHaze, setMistFarHaze] = useState(true);
  const [mistMiddle, setMistMiddle] = useState(true);
  const [mistGround, setMistGround] = useState(true);
  const [mistFore, setMistFore] = useState(true);
  const [vegetationOnly, setVegetationOnly] = useState(false);
  const [atmosphereOnly, setAtmosphereOnly] = useState(false);
  const [staticFallback, setStaticFallback] = useState(false);
  const [freezeAnimation, setFreezeAnimation] = useState(false);
  const [mistEdgeDebug, setMistEdgeDebug] = useState(false);
  const [mistNoiseContrast, setMistNoiseContrast] = useState(1.2);
  const [mistOpacityMultiplier, setMistOpacityMultiplier] = useState(1.0);
  const [mistMotionSpeed, setMistMotionSpeed] = useState(1.0);
  const [brightBackground, setBrightBackground] = useState(false);

  const [precipitationAmount, setPrecipitationAmount] = useState(100);
  const [wetness, setWetness] = useState(100);
  const [dropletAmount, setDropletAmount] = useState(100);
  const [fps, setFps] = useState(0);

  // Sync dev flags to window
  useEffect(() => {
    (window as any).__DEV_LAB__ = {
      mistSceneFog, mistFarHaze, mistMiddle, mistGround, mistFore, vegetationOnly, atmosphereOnly, staticFallback,
      freezeAnimation, mistEdgeDebug, mistNoiseContrast, mistOpacityMultiplier, mistMotionSpeed
    };
  }, [
    mistSceneFog, mistFarHaze, mistMiddle, mistGround, mistFore, vegetationOnly, atmosphereOnly, staticFallback,
    freezeAnimation, mistEdgeDebug, mistNoiseContrast, mistOpacityMultiplier, mistMotionSpeed
  ]);

  const preferences: EnvironmentPreferences = {
    ...artistEnvironmentDefaults,
    preset: preset,
    phase: phase,
    precipitationAmount,
    wetness,
    dropletAmount,
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
      <div className={`absolute inset-0 transition-all duration-500 ${darkBackground ? "bg-black opacity-100" : brightBackground ? "bg-white opacity-100" : "opacity-100"}`}>
        {!darkBackground && !brightBackground && (
          <Image
            src="/images/hero-background.jpg" // Assuming there's a default background image to test with
            alt="Hero Background"
            fill
            className="object-cover"
            unoptimized
          />
        )}
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
      {!staticFallback && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {quality.enabled && (
            <PublicEnvironmentCanvas
              key={JSON.stringify((window as any).__DEV_LAB__)}
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
      )}

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
            <input type="checkbox" checked={darkBackground} onChange={e => { setDarkBackground(e.target.checked); setBrightBackground(false); }} />
            <span>Dark Background (Debug)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={brightBackground} onChange={e => { setBrightBackground(e.target.checked); setDarkBackground(false); }} />
            <span>Bright Background (Debug)</span>
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

        {preset === "mist" && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">Mist Debug</label>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistSceneFog} onChange={e => setMistSceneFog(e.target.checked)} /> Scene Fog</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistFarHaze} onChange={e => setMistFarHaze(e.target.checked)} /> Far Haze</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistMiddle} onChange={e => setMistMiddle(e.target.checked)} /> Middle Banks</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistGround} onChange={e => setMistGround(e.target.checked)} /> Ground Mist</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistFore} onChange={e => setMistFore(e.target.checked)} /> Fore Veil</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={vegetationOnly} onChange={e => setVegetationOnly(e.target.checked)} /> Trees Only</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={atmosphereOnly} onChange={e => setAtmosphereOnly(e.target.checked)} /> Atmos Only</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={freezeAnimation} onChange={e => setFreezeAnimation(e.target.checked)} /> Freeze Anim</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mistEdgeDebug} onChange={e => setMistEdgeDebug(e.target.checked)} /> Edge Debug</label>
              <label className="flex items-center gap-2 cursor-pointer text-amber-400"><input type="checkbox" checked={staticFallback} onChange={e => setStaticFallback(e.target.checked)} /> Static CSS</label>
            </div>
            
            <div className="flex flex-col gap-1 text-xs mt-2">
              <label className="flex justify-between">
                <span>Contrast</span>
                <input type="range" min="0" max="3" step="0.1" value={mistNoiseContrast} onChange={e => setMistNoiseContrast(Number(e.target.value))} />
              </label>
              <label className="flex justify-between">
                <span>Opacity Mul</span>
                <input type="range" min="0" max="3" step="0.1" value={mistOpacityMultiplier} onChange={e => setMistOpacityMultiplier(Number(e.target.value))} />
              </label>
              <label className="flex justify-between">
                <span>Motion Speed</span>
                <input type="range" min="0" max="3" step="0.1" value={mistMotionSpeed} onChange={e => setMistMotionSpeed(Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        {preset === "rain" && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">Rain Weather</label>
            <div className="flex flex-col gap-1 text-xs">
              <label className="flex justify-between">
                <span>Precipitation</span>
                <input type="range" min="0" max="100" value={precipitationAmount} onChange={e => setPrecipitationAmount(Number(e.target.value))} />
              </label>
              <label className="flex justify-between">
                <span>Wetness</span>
                <input type="range" min="0" max="100" value={wetness} onChange={e => setWetness(Number(e.target.value))} />
              </label>
              <label className="flex justify-between">
                <span>Droplets</span>
                <input type="range" min="0" max="100" value={dropletAmount} onChange={e => setDropletAmount(Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        {preset === "autumn" && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">Autumn Leaves</label>
            <div className="flex flex-col gap-1 text-xs">
              <label className="flex justify-between">
                <span>Leaf Amount</span>
                <input type="range" min="0" max="100" value={preferences.particleAmount} onChange={e => {}} readOnly />
              </label>
            </div>
          </div>
        )}

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
