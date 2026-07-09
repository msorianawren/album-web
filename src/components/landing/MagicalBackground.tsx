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

export function MagicalBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,250,242,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(244,238,228,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(63,51,43,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,238,228,0.03),transparent_50%)]" />
      
      {/* Particles/fireflies */}
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
    </div>
  );
}
