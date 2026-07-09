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
  if (!config.enabled) return null;

  const presets = {
    aura: "bg-[radial-gradient(ellipse_at_top_right,rgba(255,250,242,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(244,238,228,0.05),transparent_50%)]",
    moonlit: "bg-[radial-gradient(ellipse_at_top,rgba(200,210,240,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(150,170,220,0.08),transparent_60%)]",
    bloom: "bg-[radial-gradient(ellipse_at_center,rgba(255,220,230,0.15),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(220,180,190,0.06),transparent_70%)]",
    pearl: "bg-[radial-gradient(ellipse_at_top_left,rgba(255,245,235,0.2),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(240,230,220,0.08),transparent_60%)]",
    porcelain: "bg-[radial-gradient(circle_at_center,rgba(250,250,250,0.3),transparent_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(250,250,250,0.04),transparent_100%)]",
  };

  const presetClass = presets[config.preset] || presets.aura;

  const customGradients = [];
  if (config.accent_color_1) customGradients.push(`radial-gradient(circle at top right, ${config.accent_color_1}33, transparent 50%)`);
  if (config.accent_color_2) customGradients.push(`radial-gradient(circle at bottom left, ${config.accent_color_2}33, transparent 50%)`);

  const intensityOpacity = (config.intensity ?? 100) / 100;
  const mainOpacity = (config.opacity ?? 100) / 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true" style={{ opacity: mainOpacity }}>
      
      {config.custom_url && (
        <div className="absolute inset-0 opacity-40 mix-blend-luminosity dark:mix-blend-screen">
          {config.custom_url.match(/\.(mp4|webm)$/i) ? (
            <video src={config.custom_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          ) : (
            <img src={config.custom_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      )}

      <div className={`absolute inset-0 ${presetClass}`} style={{ opacity: intensityOpacity }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(63,51,43,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,238,228,0.03),transparent_50%)]" style={{ opacity: intensityOpacity }} />
      
      {customGradients.length > 0 && (
        <div className="absolute inset-0" style={{ backgroundImage: customGradients.join(', '), opacity: intensityOpacity }} />
      )}
      
      {config.grain && (
        <svg className="absolute inset-0 h-full w-full opacity-20 dark:opacity-10 mix-blend-overlay">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      )}

      {config.particles && (
        <div className="absolute inset-0 opacity-50 mix-blend-screen dark:opacity-30">
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="magic-particle absolute h-1.5 w-1.5 rounded-full bg-white blur-[1px]"
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
  );
}
