"use client";

import { usePathname } from "next/navigation";
import type { LandingBackgroundSettings } from "@/lib/types";
import { useEffect, useState } from "react";
import { useUIPreferences } from "@/hooks/useUIPreferences";
import { imageStore } from "@/lib/idb";

const generateParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 20,
    durationBase: 10 + Math.random() * 20,
    scale: 0.4 + Math.random() * 0.8,
  }));
};

import { NatureSettlingEffect } from "./NatureSettlingEffect";

type NatureParticle = ReturnType<typeof generateParticles>[number];

const defaultBackgroundSettings: LandingBackgroundSettings = {
  enabled: true,
  preset: "mist",
  intensity: 50,
  opacity: 45,
  speed: 50,
  density: 50,
  blur: 2,
  accent_color_1: null,
  accent_color_2: null,
  custom_url: null,
  apply_to_all_public_pages: true,
  reduce_animations_on_mobile: true,
};

export function NatureAnimatedBackground({ config }: { config?: Partial<LandingBackgroundSettings> }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<NatureParticle[]>([]);
  const resolvedConfig = { ...defaultBackgroundSettings, ...config };
  
  const { bgThemeOverride, bgCustomUrlOverride } = useUIPreferences();
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

  // Determine final effective settings
  const effectivePreset = bgThemeOverride !== "default" ? bgThemeOverride : resolvedConfig.preset;
  const effectiveCustomUrl = bgCustomUrlOverride && customImageUrl ? customImageUrl : (!bgCustomUrlOverride ? resolvedConfig.custom_url : null);
  // Enhance default preset intensity slightly
  const effectiveIntensity = Math.min(100, resolvedConfig.intensity * 1.5);

  useEffect(() => {
    if (bgCustomUrlOverride) {
      imageStore.get("custom_background").then(val => {
        if (val) setCustomImageUrl(val);
      });
    }
  }, [bgCustomUrlOverride]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);

      // Check if mobile and reduction is enabled
      const isMobile = window.innerWidth <= 768;
      const shouldReduce = isMobile && resolvedConfig.reduce_animations_on_mobile;

      // Cap particles aggressively for performance
      let baseCount = Math.floor((resolvedConfig.density / 100) * 20) + 2;
      if (shouldReduce) {
        baseCount = Math.max(2, Math.floor(baseCount * 0.3));
      }

      const count = effectivePreset === "rain" ? Math.floor(baseCount * 1.5) : baseCount;
      setParticles(generateParticles(count));
    }, 0);

    // Inject global CSS variables for UI integration
    const root = document.documentElement;
    if (effectivePreset === "sakura") {
      root.style.setProperty("--preset-accent", "rgba(255, 183, 197, 0.4)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(255, 183, 197, 0.15)");
      root.style.setProperty("--preset-hover-bg", "rgba(255, 183, 197, 0.05)");
    } else if (effectivePreset === "autumn") {
      root.style.setProperty("--preset-accent", "rgba(194, 107, 66, 0.4)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(194, 107, 66, 0.15)");
      root.style.setProperty("--preset-hover-bg", "rgba(194, 107, 66, 0.05)");
    } else if (effectivePreset === "rain") {
      root.style.setProperty("--preset-accent", "rgba(150, 180, 200, 0.4)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(150, 180, 200, 0.15)");
      root.style.setProperty("--preset-hover-bg", "rgba(150, 180, 200, 0.05)");
    } else if (effectivePreset === "snow") {
      root.style.setProperty("--preset-accent", "rgba(255, 255, 255, 0.5)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(255, 255, 255, 0.2)");
      root.style.setProperty("--preset-hover-bg", "rgba(255, 255, 255, 0.05)");
    } else if (effectivePreset === "fireflies") {
      root.style.setProperty("--preset-accent", "rgba(227, 211, 143, 0.4)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(227, 211, 143, 0.15)");
      root.style.setProperty("--preset-hover-bg", "rgba(227, 211, 143, 0.05)");
    } else {
      root.style.setProperty("--preset-accent", "rgba(200, 200, 200, 0.3)");
      root.style.setProperty("--preset-glow", "0 0 20px rgba(200, 200, 200, 0.1)");
      root.style.setProperty("--preset-hover-bg", "rgba(200, 200, 200, 0.05)");
    }
    return () => window.clearTimeout(timer);
  }, [resolvedConfig.density, resolvedConfig.reduce_animations_on_mobile, effectivePreset]);

  if (!mounted) return null;
  if (resolvedConfig.enabled === false || (resolvedConfig.enabled as unknown) === "false") return null;
  if (pathname?.startsWith("/studio") || pathname?.startsWith("/login")) return null;
  if (!resolvedConfig.apply_to_all_public_pages && pathname !== "/") return null;

  const blurVal = effectivePreset === "mist" ? 6 : 2;
  const speedMultiplier = resolvedConfig.speed > 0 ? 50 / resolvedConfig.speed : 999;

  const cssVars = {
    "--nature-opacity": (resolvedConfig.opacity / 100).toString(),
    "--nature-intensity": (effectiveIntensity / 100).toString(),
    "--nature-blur": `${blurVal}px`,
  } as React.CSSProperties;

  return (
    <>
      <NatureSettlingEffect preset={effectivePreset as string} />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={cssVars}>
      <style>{`
        .nature-container { opacity: var(--nature-opacity); transition: opacity 1s; }
        .nature-layer { position: absolute; inset: -20%; will-change: transform; }
        
        @keyframes fall-sakura {
          0% { transform: translate3d(0, -20vh, 0) rotate(0deg); }
          100% { transform: translate3d(20vw, 120vh, 0) rotate(360deg); }
        }
        .sakura-petal {
          position: absolute; width: 14px; height: 18px;
          background: #ffb7c5; border-radius: 14px 0 14px 0;
          opacity: calc(0.6 * var(--nature-intensity));
        }
        .theme-night .sakura-petal { background: #ffc0cb; opacity: calc(0.3 * var(--nature-intensity)); }

        @keyframes float-firefly {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.1; }
          50% { transform: translate3d(30px, -40px, 0); opacity: calc(0.9 * var(--nature-intensity)); }
        }
        .firefly {
          position: absolute; width: 5px; height: 5px;
          background: #e3d38f; border-radius: 50%;
          box-shadow: 0 0 10px 2px #e3d38f;
          opacity: calc(0.6 * var(--nature-intensity));
        }
        .theme-night .firefly { mix-blend-mode: screen; opacity: 1; }

        @keyframes fall-snow {
          0% { transform: translate3d(0, -20vh, 0); }
          100% { transform: translate3d(10vw, 120vh, 0); }
        }
        .snow-flake {
          position: absolute; width: 5px; height: 5px;
          background: rgba(0,0,0,0.2); border-radius: 50%;
          opacity: calc(0.7 * var(--nature-intensity));
        }
        .theme-night .snow-flake { background: white; }

        @keyframes fall-autumn {
          0% { transform: translate3d(0, -20vh, 0) rotate3d(1, 1, 0, 0deg); }
          100% { transform: translate3d(15vw, 120vh, 0) rotate3d(1, 1, 0, 360deg); }
        }
        .autumn-leaf {
          position: absolute; width: 16px; height: 16px;
          background: #c26b42; border-radius: 16px 2px 16px 2px;
          opacity: calc(0.7 * var(--nature-intensity));
        }

        @keyframes pan-mist {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-25%, 0, 0); }
        }
        .mist-layer {
          position: absolute; 
          top: -20%; left: 0; right: -100%; bottom: -20%; /* wider than viewport to allow panning */
          background: 
            radial-gradient(circle at 30% 50%, rgba(0,0,0,0.03) 0%, transparent 40%),
            radial-gradient(circle at 70% 80%, rgba(0,0,0,0.02) 0%, transparent 40%);
          animation: pan-mist 60s linear infinite;
          opacity: var(--nature-intensity);
          will-change: transform;
        }
        .theme-night .mist-layer {
          background: 
            radial-gradient(circle at 30% 50%, rgba(200,220,255,0.03) 0%, transparent 40%),
            radial-gradient(circle at 70% 80%, rgba(200,220,255,0.05) 0%, transparent 40%);
          mix-blend-mode: screen;
        }

        @keyframes fall-rain {
          0% { transform: translate3d(0, -20vh, 0); }
          100% { transform: translate3d(5vw, 120vh, 0); }
        }
        .rain-drop {
          position: absolute; width: 1px; height: 40px;
          background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.15));
          opacity: calc(0.6 * var(--nature-intensity));
        }
        .theme-night .rain-drop {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.3));
        }

        @media (prefers-reduced-motion: reduce) {
          .sakura-petal, .firefly, .snow-flake, .autumn-leaf, .mist-layer, .rain-drop {
            animation-duration: 0s !important;
            animation-play-state: paused !important;
          }
        }
      `}</style>

      <div className="nature-container absolute inset-0">
        
        {effectiveCustomUrl && (
          <div className="absolute inset-0 opacity-20 dark:opacity-30">
            {effectiveCustomUrl.match(/\.(mp4|webm)$/i) || effectiveCustomUrl.startsWith("data:video") ? (
              <video src={effectiveCustomUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={effectiveCustomUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}

        <div className="nature-layer pointer-events-none">
          {effectivePreset === "mist" && <div className="mist-layer" style={{ animationDuration: `${60 * speedMultiplier}s` }} />}
          
          {effectivePreset !== "mist" && particles.map(p => {
            const animationName = 
              effectivePreset === "sakura" ? "fall-sakura" :
              effectivePreset === "fireflies" ? "float-firefly" :
              effectivePreset === "snow" ? "fall-snow" :
              effectivePreset === "rain" ? "fall-rain" :
              "fall-autumn";
            
            const className = 
              effectivePreset === "sakura" ? "sakura-petal" :
              effectivePreset === "fireflies" ? "firefly" :
              effectivePreset === "snow" ? "snow-flake" :
              effectivePreset === "rain" ? "rain-drop" :
              "autumn-leaf";

            return (
              <div
                key={p.id}
                className={className}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: `scale(${p.scale})`,
                  animationName,
                  animationDelay: `-${p.delay}s`,
                  animationDuration: effectivePreset === "rain" ? `${(p.durationBase * 0.2) * speedMultiplier}s` : `${p.durationBase * speedMultiplier}s`,
                  animationTimingFunction: effectivePreset === "fireflies" ? "ease-in-out" : "linear",
                  animationIterationCount: "infinite",
                }}
              />
            );
          })}
        </div>

        {(resolvedConfig.accent_color_1 || resolvedConfig.accent_color_2) && (
          <div 
            className="absolute inset-0"
            style={{ 
              opacity: (resolvedConfig.intensity / 100),
              backgroundImage: [
                resolvedConfig.accent_color_1 ? `radial-gradient(circle at top right, ${resolvedConfig.accent_color_1}33, transparent 60%)` : null,
                resolvedConfig.accent_color_2 ? `radial-gradient(circle at bottom left, ${resolvedConfig.accent_color_2}33, transparent 60%)` : null
              ].filter(Boolean).join(", ")
            }}
          />
        )}
      </div>
      </div>
    </>
  );
}
