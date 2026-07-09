"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface CustomCursorProps {
  preset: "sakura" | "fireflies" | "snow" | "autumn" | "mist" | "rain";
}

export function CustomCursor({ preset }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    // Only enable on fine pointer devices (desktops)
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsFinePointer(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isFinePointer || !cursorRef.current || !ringRef.current) return;

    // Use quickTo for optimal performance on mousemove
    const xMoveCursor = gsap.quickTo(cursorRef.current, "x", { duration: 0.1, ease: "power3" });
    const yMoveCursor = gsap.quickTo(cursorRef.current, "y", { duration: 0.1, ease: "power3" });
    
    const xMoveRing = gsap.quickTo(ringRef.current, "x", { duration: 0.3, ease: "power3" });
    const yMoveRing = gsap.quickTo(ringRef.current, "y", { duration: 0.3, ease: "power3" });

    const onMouseMove = (e: MouseEvent) => {
      xMoveCursor(e.clientX);
      yMoveCursor(e.clientY);
      xMoveRing(e.clientX);
      yMoveRing(e.clientY);
    };

    const onMouseDown = () => setClicked(true);
    const onMouseUp = () => setClicked(false);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") || 
        target.closest("button") || 
        target.closest("input") || 
        target.closest("textarea") || 
        target.closest("[role='button']") ||
        target.closest(".album-card")
      ) {
        setIsHovering(true);
      }
    };

    const onMouseOut = () => setIsHovering(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
    };
  }, [isFinePointer]);

  // Handle scale animation for hover and click
  useEffect(() => {
    if (!isFinePointer || !cursorRef.current || !ringRef.current) return;
    
    gsap.to(cursorRef.current, {
      scale: clicked ? 0.5 : isHovering ? 0 : 1,
      duration: 0.2,
    });

    gsap.to(ringRef.current, {
      scale: clicked ? 0.8 : isHovering ? 1.5 : 1,
      opacity: isHovering ? 0.5 : 0.8,
      duration: 0.3,
    });
  }, [isHovering, clicked, isFinePointer]);

  if (!isFinePointer) return null;

  const cursorStyles: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "8px",
    height: "8px",
    marginLeft: "-4px",
    marginTop: "-4px",
    borderRadius: "50%",
    backgroundColor: "var(--cursor-color, #ffffff)",
    mixBlendMode: "difference",
    pointerEvents: "none",
    zIndex: 9999,
  };

  const ringStyles: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "32px",
    height: "32px",
    marginLeft: "-16px",
    marginTop: "-16px",
    borderRadius: "50%",
    border: "1px solid var(--cursor-color, #ffffff)",
    mixBlendMode: "difference",
    pointerEvents: "none",
    zIndex: 9998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const presetAccentStyles: React.CSSProperties = {
    position: "absolute",
    width: preset === "sakura" ? "6px" : preset === "autumn" ? "6px" : preset === "fireflies" ? "4px" : "0px",
    height: preset === "sakura" ? "8px" : preset === "autumn" ? "6px" : preset === "fireflies" ? "4px" : "0px",
    backgroundColor: 
      preset === "sakura" ? "#ffb7c5" : 
      preset === "autumn" ? "#c26b42" : 
      preset === "fireflies" ? "#e3d38f" : "transparent",
    borderRadius: preset === "sakura" ? "6px 0 6px 0" : preset === "autumn" ? "2px" : "50%",
    top: "-12px",
    right: "-12px",
    opacity: isHovering ? 0 : 1,
    transition: "opacity 0.2s ease",
  };

  return (
    <>
      <style>{`
        /* Hide default cursor globally when custom cursor is active */
        body { cursor: none !important; }
        a, button, input, select, textarea, [role="button"], .cursor-pointer { cursor: none !important; }
      `}</style>
      <div ref={cursorRef} style={cursorStyles} />
      <div ref={ringRef} style={ringStyles}>
        {/* Subdued preset accent floating outside the ring */}
        <div style={presetAccentStyles} />
      </div>
    </>
  );
}
