"use client";


interface AboutVeilProps {
  tokens: React.CSSProperties;
  className?: string;
}

export function AboutVeil({ tokens, className = "" }: AboutVeilProps) {

  const gradientStops = (tokens as any)["--about-veil-gradient-positions"] as string;
  const stops = gradientStops.split(",").map(s => s.trim());
  const s0 = stops[0] || "0%";
  const s1 = stops[1] || "50%";
  const s2 = stops[2] || "100%";

  return (
    <div 
      className={`absolute inset-0 pointer-events-none -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div 
        className="absolute inset-[-15%] sm:inset-[-25%]"
        style={{
          maskImage: `radial-gradient(ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin), black 0%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin), black 0%, transparent 80%)`,
        }}
      >
        {/* Layer 1 & 2: Environment-tinted base and reading core */}
        <div 
          className="absolute inset-0 supports-[background:radial-gradient(in_oklab,red,blue)]:hidden"
          style={{
            background: `radial-gradient(
              ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin),
              var(--about-veil-base-center) ${s0},
              var(--about-veil-base-middle) ${s1},
              var(--about-veil-base-outer) ${s2}
            )`
          }}
        />
        <div 
          className="absolute inset-0 hidden supports-[background:radial-gradient(in_oklab,red,blue)]:block"
          style={{
            background: `radial-gradient(
              in oklab,
              ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin),
              var(--about-veil-base-center) ${s0},
              var(--about-veil-base-middle) ${s1},
              var(--about-veil-base-outer) ${s2}
            )`
          }}
        />
        
        {/* Layer 3: Subtle environment accent bloom */}
        <div 
          className="absolute inset-0 mix-blend-overlay opacity-[0.12]"
          style={{
            background: `radial-gradient(
              ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin),
              var(--about-veil-accent) 0%,
              transparent 60%
            )`
          }}
        />

        {/* Backdrop Filter / Blur */}
        <div 
          className="absolute inset-0 supports-[backdrop-filter:blur(1px)]:backdrop-blur-[var(--about-veil-blur)]"
          style={{
            maskImage: `radial-gradient(ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin), black 0%, transparent 70%)`,
            WebkitMaskImage: `radial-gradient(ellipse var(--about-veil-ellipse-size) at var(--about-veil-ellipse-origin), black 0%, transparent 70%)`,
          }}
        />
      </div>
    </div>
  );
}
