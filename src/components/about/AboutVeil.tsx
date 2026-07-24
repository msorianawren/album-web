"use client";

interface AboutVeilProps {
  tokens: React.CSSProperties;
  className?: string;
}

export function AboutVeil({ tokens, className = "" }: AboutVeilProps) {
  return (
    <div 
      className={`absolute inset-[-15%] sm:inset-[-25%] pointer-events-none -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{
        ...tokens,
        background: `var(--about-veil-bloom), var(--about-veil-surface)`,
        backdropFilter: `blur(var(--about-veil-blur))`,
        WebkitBackdropFilter: `blur(var(--about-veil-blur))`,
        maskImage: `var(--about-veil-mask)`,
        WebkitMaskImage: `var(--about-veil-mask)`,
      }}
    />
  );
}
