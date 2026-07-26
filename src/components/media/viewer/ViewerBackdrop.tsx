"use client";

export function ViewerBackdrop({ hue }: { hue: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-70 transition-colors duration-500"
      style={{
        background: `radial-gradient(circle at 50% 45%, hsl(${hue} 30% 16% / 0.62), transparent 58%), radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,.78) 100%)`,
      }}
      aria-hidden="true"
    />
  );
}
