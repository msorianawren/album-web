import type { LandingBackgroundSettings } from "@/lib/types";

const PARTICLES = [
  { top: "12%", left: "24%", delay: "1.2s", duration: "16s" },
  { top: "45%", left: "78%", delay: "2.4s", duration: "22s" },
  { top: "82%", left: "15%", delay: "0.5s", duration: "18s" },
  { top: "33%", left: "56%", delay: "4.1s", duration: "25s" },
  { top: "67%", left: "89%", delay: "1.8s", duration: "19s" },
  { top: "91%", left: "34%", delay: "3.2s", duration: "21s" },
  { top: "18%", left: "67%", delay: "0.9s", duration: "17s" },
  { top: "54%", left: "12%", delay: "2.7s", duration: "24s" },
  { top: "76%", left: "45%", delay: "1.5s", duration: "20s" },
  { top: "29%", left: "91%", delay: "3.8s", duration: "23s" },
  { top: "88%", left: "62%", delay: "4.5s", duration: "26s" },
  { top: "41%", left: "28%", delay: "0.2s", duration: "15s" },
  { top: "63%", left: "71%", delay: "2.1s", duration: "18s" },
  { top: "15%", left: "84%", delay: "3.5s", duration: "22s" },
  { top: "95%", left: "5%", delay: "1.1s", duration: "19s" },
];

export function MagicalBackground({ config }: { config: LandingBackgroundSettings }) {
  if (config.enabled === false || (config.enabled as unknown) === "false") return null;

  const presets = {
    aura: {
      light: "radial-gradient(ellipse at top right, rgba(255,250,242,0.15), transparent 50%)",
      dark: "radial-gradient(ellipse at top right, rgba(244,238,228,0.05), transparent 50%)"
    },
    moonlit: {
      light: "radial-gradient(ellipse at top, rgba(200,210,240,0.15), transparent 60%)",
      dark: "radial-gradient(ellipse at top, rgba(150,170,220,0.08), transparent 60%)"
    },
    bloom: {
      light: "radial-gradient(ellipse at center, rgba(255,220,230,0.15), transparent 70%)",
      dark: "radial-gradient(ellipse at center, rgba(220,180,190,0.06), transparent 70%)"
    },
    pearl: {
      light: "radial-gradient(ellipse at top left, rgba(255,245,235,0.2), transparent 60%)",
      dark: "radial-gradient(ellipse at top left, rgba(240,230,220,0.08), transparent 60%)"
    },
    porcelain: {
      light: "radial-gradient(circle at center, rgba(250,250,250,0.3), transparent 100%)",
      dark: "radial-gradient(circle at center, rgba(250,250,250,0.04), transparent 100%)"
    }
  };

  const currentPreset = presets[config.preset] || presets.aura;

  const intensityOpacity = (Number(config.intensity) || 100) / 100;
  const mainOpacity = (Number(config.opacity) || 100) / 100;

  const cssVars = {
    "--mbg-opacity": mainOpacity,
    "--mbg-intensity": intensityOpacity,
    "--mbg-preset-light": currentPreset.light,
    "--mbg-preset-dark": currentPreset.dark,
    "--mbg-accent-1-light": config.accent_color_1 ? `radial-gradient(circle at top right, ${config.accent_color_1}60, transparent 60%)` : "none",
    "--mbg-accent-1-dark": config.accent_color_1 ? `radial-gradient(circle at top right, ${config.accent_color_1}40, transparent 60%)` : "none",
    "--mbg-accent-2-light": config.accent_color_2 ? `radial-gradient(circle at bottom left, ${config.accent_color_2}60, transparent 60%)` : "none",
    "--mbg-accent-2-dark": config.accent_color_2 ? `radial-gradient(circle at bottom left, ${config.accent_color_2}40, transparent 60%)` : "none",
  } as React.CSSProperties;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={cssVars}>
      <style>{`
        .mbg-container { opacity: var(--mbg-opacity); }
        .mbg-preset { opacity: var(--mbg-intensity); background-image: var(--mbg-preset-light); }
        .mbg-base { opacity: var(--mbg-intensity); background-image: radial-gradient(ellipse at bottom left, rgba(63,51,43,0.05), transparent 50%); }
        .mbg-accents { opacity: var(--mbg-intensity); background-image: var(--mbg-accent-1-light), var(--mbg-accent-2-light); }
        .mbg-particles { opacity: calc(var(--mbg-intensity) * 0.8); mix-blend-mode: plus-lighter; }
        .mbg-custom-url { opacity: 0.3; }
        
        .theme-night .mbg-preset { background-image: var(--mbg-preset-dark); }
        .theme-night .mbg-base { background-image: radial-gradient(ellipse at bottom left, rgba(244,238,228,0.03), transparent 50%); }
        .theme-night .mbg-accents { background-image: var(--mbg-accent-1-dark), var(--mbg-accent-2-dark); }
        .theme-night .mbg-particles { mix-blend-mode: screen; }
        .theme-night .mbg-custom-url { opacity: 0.4; }
        
        @keyframes mbg-particle-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
        }
        .magic-particle { animation-name: mbg-particle-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
      `}</style>

      <div className="mbg-container absolute inset-0">
        
        {config.custom_url && (
          <div className="mbg-custom-url absolute inset-0">
            {config.custom_url.match(/\.(mp4|webm)$/i) ? (
              <video src={config.custom_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={config.custom_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}

        <div className="mbg-preset absolute inset-0" />
        <div className="mbg-base absolute inset-0" />
        <div className="mbg-accents absolute inset-0" />

        {config.grain && (
          <svg className="absolute inset-0 h-full w-full opacity-20 dark:opacity-10 mix-blend-overlay">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        )}

        {config.particles && (
          <div className="mbg-particles absolute inset-0">
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="magic-particle absolute h-1.5 w-1.5 rounded-full bg-white blur-[1px] shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{
                  top: p.top,
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
