"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface CustomCursorProps {
  preset: "sakura" | "fireflies" | "snow" | "autumn" | "mist" | "rain";
}

const PRESET_CONFIGS = {
  sakura: {
    ringBg: "rgba(255, 183, 197, 0.15)",
    ringBorder: "rgba(255, 183, 197, 0.5)",
    dotBg: "#ffb7c5",
    accentType: "petal",
    clickRipple: "bloom",
    hoverScale: 1.5,
  },
  autumn: {
    ringBg: "rgba(194, 107, 66, 0.15)",
    ringBorder: "rgba(194, 107, 66, 0.5)",
    dotBg: "#c26b42",
    accentType: "leaf",
    clickRipple: "swirl",
    hoverScale: 1.4,
  },
  rain: {
    ringBg: "rgba(150, 180, 200, 0.15)",
    ringBorder: "rgba(150, 180, 200, 0.5)",
    dotBg: "rgba(180, 210, 230, 0.9)",
    accentType: "drop",
    clickRipple: "water",
    hoverScale: 1.6,
  },
  snow: {
    ringBg: "rgba(255, 255, 255, 0.15)",
    ringBorder: "rgba(255, 255, 255, 0.5)",
    dotBg: "#ffffff",
    accentType: "crystal",
    clickRipple: "frost",
    hoverScale: 1.3,
  },
  fireflies: {
    ringBg: "rgba(227, 211, 143, 0.1)",
    ringBorder: "rgba(227, 211, 143, 0.3)",
    dotBg: "#ffea94",
    accentType: "glow",
    clickRipple: "firefly",
    hoverScale: 1.8,
  },
  mist: {
    ringBg: "rgba(200, 200, 200, 0.1)",
    ringBorder: "rgba(200, 200, 200, 0.2)",
    dotBg: "rgba(200, 200, 200, 0.6)",
    accentType: "blur",
    clickRipple: "diffuse",
    hoverScale: 1.5,
  }
};

export function CustomCursor({ preset }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const accentRef = useRef<HTMLDivElement>(null);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS.sakura;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsFinePointer(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isFinePointer || !cursorRef.current || !ringRef.current || !accentRef.current) return;

    const xMoveCursor = gsap.quickTo(cursorRef.current, "x", { duration: 0.1, ease: "power3" });
    const yMoveCursor = gsap.quickTo(cursorRef.current, "y", { duration: 0.1, ease: "power3" });
    
    const xMoveRing = gsap.quickTo(ringRef.current, "x", { duration: 0.3, ease: "power3" });
    const yMoveRing = gsap.quickTo(ringRef.current, "y", { duration: 0.3, ease: "power3" });
    
    // Accent floats with a slight offset and delay
    const xMoveAccent = gsap.quickTo(accentRef.current, "x", { duration: 0.4, ease: "power2" });
    const yMoveAccent = gsap.quickTo(accentRef.current, "y", { duration: 0.4, ease: "power2" });

    const onMouseMove = (e: MouseEvent) => {
      xMoveCursor(e.clientX);
      yMoveCursor(e.clientY);
      xMoveRing(e.clientX);
      yMoveRing(e.clientY);
      xMoveAccent(e.clientX + 14); // Offset to bottom right
      yMoveAccent(e.clientY + 14);
    };

    const onMouseDown = () => {
      // Trigger preset-specific ripple
      const tl = gsap.timeline();
      if (config.clickRipple === "water") {
        tl.to(ringRef.current, { scale: 2.0, borderWidth: 0, opacity: 0, duration: 0.4, ease: "power2.out" })
          .set(ringRef.current, { scale: isHovering ? config.hoverScale : 1, borderWidth: 1, opacity: 1 });
      } else if (config.clickRipple === "bloom") {
        tl.to(ringRef.current, { scale: 1.2, duration: 0.2, ease: "back.out(2)" })
          .to(ringRef.current, { scale: isHovering ? config.hoverScale : 1, duration: 0.3 });
      } else if (config.clickRipple === "firefly") {
        tl.to(cursorRef.current, { scale: 1.8, boxShadow: `0 0 20px ${config.dotBg}`, duration: 0.1 })
          .to(cursorRef.current, { scale: 1, boxShadow: "none", duration: 0.4 });
      } else if (config.clickRipple === "swirl") {
        tl.to(ringRef.current, { rotation: "+=45", scale: 0.8, duration: 0.2 })
          .to(ringRef.current, { rotation: "+=45", scale: isHovering ? config.hoverScale : 1, duration: 0.4 });
      } else if (config.clickRipple === "frost") {
        tl.to(ringRef.current, { scale: 1.3, backgroundColor: "rgba(255,255,255,0.4)", duration: 0.1 })
          .to(ringRef.current, { scale: isHovering ? config.hoverScale : 1, backgroundColor: config.ringBg, duration: 0.4 });
      } else {
        // default diffuse
        tl.to(ringRef.current, { scale: 1.4, filter: "blur(4px)", duration: 0.2 })
          .to(ringRef.current, { scale: isHovering ? config.hoverScale : 1, filter: "blur(0px)", duration: 0.3 });
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") || 
        target.closest("button") || 
        target.closest("input") || 
        target.closest("textarea") || 
        target.closest("[role='button']") ||
        target.closest(".album-card") ||
        target.closest(".hover-trigger")
      ) {
        setIsHovering(true);
      }
    };

    const onMouseOut = () => setIsHovering(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
    };
  }, [isFinePointer, isHovering, config]);

  useEffect(() => {
    if (!isFinePointer || !cursorRef.current || !ringRef.current || !accentRef.current) return;
    
    gsap.to(cursorRef.current, {
      scale: isHovering ? 0 : 1,
      opacity: isHovering ? 0 : 1,
      duration: 0.2,
    });

    gsap.to(ringRef.current, {
      scale: isHovering ? config.hoverScale : 1,
      backgroundColor: isHovering ? config.ringBg.replace("0.15", "0.3").replace("0.1", "0.2") : config.ringBg,
      duration: 0.3,
    });
    
    gsap.to(accentRef.current, {
      opacity: isHovering ? 0 : 1,
      scale: isHovering ? 0 : 1,
      duration: 0.2,
    });
  }, [isHovering, config, isFinePointer]);

  if (!isFinePointer) return null;

  return (
    <>
      <style>{`
        body { cursor: none !important; }
        a, button, input, select, textarea, [role="button"], .cursor-pointer { cursor: none !important; }
      `}</style>

      {/* Main Dot */}
      <div 
        ref={cursorRef} 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "6px",
          height: "6px",
          marginLeft: "-3px",
          marginTop: "-3px",
          borderRadius: "50%",
          backgroundColor: config.dotBg,
          boxShadow: config.accentType === "glow" ? `0 0 8px ${config.dotBg}` : "none",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
        }} 
      />

      {/* Glass Ring */}
      <div 
        ref={ringRef} 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "36px",
          height: "36px",
          marginLeft: "-18px",
          marginTop: "-18px",
          borderRadius: "50%",
          backgroundColor: config.ringBg,
          border: `1px solid ${config.ringBorder}`,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

      {/* Preset Accent Ornament */}
      <div 
        ref={accentRef} 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: config.accentType === "petal" ? "7px" : config.accentType === "leaf" ? "8px" : config.accentType === "drop" ? "3px" : config.accentType === "crystal" ? "4px" : "0px",
          height: config.accentType === "petal" ? "10px" : config.accentType === "leaf" ? "8px" : config.accentType === "drop" ? "8px" : config.accentType === "crystal" ? "4px" : "0px",
          backgroundColor: config.dotBg,
          opacity: config.accentType === "glow" || config.accentType === "blur" ? 0 : 0.8,
          borderRadius: 
            config.accentType === "petal" ? "7px 0 7px 0" : 
            config.accentType === "leaf" ? "2px 8px 2px 8px" : 
            config.accentType === "drop" ? "0 50% 50% 50%" : 
            "50%",
          transform: config.accentType === "drop" ? "rotate(45deg)" : "none",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
        }} 
      />
    </>
  );
}
