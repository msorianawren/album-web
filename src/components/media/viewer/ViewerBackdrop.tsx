"use client";

export function ViewerBackdrop({ hue, cinematic }: { hue: number; cinematic: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${cinematic ? "opacity-70" : "opacity-100"}`}
      style={{
        background: cinematic
          ? `radial-gradient(circle at 50% 45%, hsl(${hue} 30% 16% / 0.62), transparent 58%), radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,.78) 100%)`
          : "#060608",
      }}
      aria-hidden="true"
    />
  );
}
