"use client";

import { usePathname } from "next/navigation";
import type { LandingBackgroundSettings } from "@/lib/types";
import { useEffect, useState } from "react";

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

export function NatureAnimatedBackground({ config }: { config: LandingBackgroundSettings }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const count = Math.floor((config.density / 100) * 80) + 5;
    setParticles(generateParticles(count));
  }, [config.density]);

  if (!mounted) return null;
  if (config.enabled === false || (config.enabled as unknown) === "false") return null;
  if (pathname?.startsWith("/studio") || pathname?.startsWith("/login")) return null;
  if (!config.apply_to_all_public_pages && pathname !== "/") return null;

  const speedMultiplier = config.speed > 0 ? 50 / config.speed : 999;
  const blurVal = (config.blur / 100) * 12;

  const cssVars = {
    "--nature-opacity": (config.opacity / 100).toString(),
    "--nature-intensity": (config.intensity / 100).toString(),
    "--nature-blur": `${blurVal}px`,
  } as React.CSSProperties;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={cssVars}>
      <style>{`
        .nature-container { opacity: var(--nature-opacity); transition: opacity 1s; }
        .nature-layer { position: absolute; inset: -10%; filter: blur(var(--nature-blur)); }
        
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
          mix-blend-mode: plus-lighter;
        }

        @keyframes fall-snow {
          0% { transform: translate3d(0, -20vh, 0); }
          100% { transform: translate3d(10vw, 120vh, 0); }
        }
        .snow-flake {
          position: absolute; width: 7px; height: 7px;
          background: white; border-radius: 50%;
          opacity: calc(0.7 * var(--nature-intensity));
          box-shadow: 0 0 6px 1px white;
        }

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
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .mist-layer {
          position: absolute; inset: -50%;
          background: 
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%),
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 60%);
          background-size: 200% 200%;
          animation: pan-mist 60s linear infinite;
          opacity: var(--nature-intensity);
          mix-blend-mode: plus-lighter;
        }
        .theme-night .mist-layer {
          background: 
            radial-gradient(circle at 50% 50%, rgba(200,220,255,0.03) 0%, transparent 60%),
            radial-gradient(circle at 20% 80%, rgba(200,220,255,0.05) 0%, transparent 60%);
          mix-blend-mode: screen;
        }

        @media (prefers-reduced-motion: reduce) {
          .sakura-petal, .firefly, .snow-flake, .autumn-leaf, .mist-layer {
            animation-duration: 0s !important;
            animation-play-state: paused !important;
          }
        }
      `}</style>

      <div className="nature-container absolute inset-0">
        
        {config.custom_url && (
          <div className="absolute inset-0 opacity-20 dark:opacity-30">
            {config.custom_url.match(/\.(mp4|webm)$/i) ? (
              <video src={config.custom_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={config.custom_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}

        <div className="nature-layer">
          {config.preset === "mist" && <div className="mist-layer" style={{ animationDuration: `${60 * speedMultiplier}s` }} />}
          
          {config.preset !== "mist" && particles.map(p => {
            const animationName = 
              config.preset === "sakura" ? "fall-sakura" :
              config.preset === "fireflies" ? "float-firefly" :
              config.preset === "snow" ? "fall-snow" :
              "fall-autumn";
            
            const className = 
              config.preset === "sakura" ? "sakura-petal" :
              config.preset === "fireflies" ? "firefly" :
              config.preset === "snow" ? "snow-flake" :
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
                  animationDuration: `${p.durationBase * speedMultiplier}s`,
                  animationTimingFunction: config.preset === "fireflies" ? "ease-in-out" : "linear",
                  animationIterationCount: "infinite",
                }}
              />
            );
          })}
        </div>

        {(config.accent_color_1 || config.accent_color_2) && (
          <div 
            className="absolute inset-0"
            style={{ 
              opacity: (config.intensity / 100),
              backgroundImage: [
                config.accent_color_1 ? `radial-gradient(circle at top right, ${config.accent_color_1}33, transparent 60%)` : null,
                config.accent_color_2 ? `radial-gradient(circle at bottom left, ${config.accent_color_2}33, transparent 60%)` : null
              ].filter(Boolean).join(", ")
            }}
          />
        )}
      </div>
    </div>
  );
}
