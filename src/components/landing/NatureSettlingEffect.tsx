"use client";

import { useEffect, useState } from "react";

interface SettlingEffectProps {
  preset: string;
}

export function NatureSettlingEffect({ preset }: SettlingEffectProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(true);
    }, 10000);

    return () => {
      clearTimeout(timer);
      setActive(false);
    };
  }, [preset]);

  if (!active) return null;

  // Lightweight Inline SVGs
  const sakuraPetal = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='18' viewBox='0 0 14 18'%3E%3Cpath fill='%23ffb7c5' d='M14 0C14 0 7 0 0 7C0 14 7 18 7 18C7 18 14 18 14 7Z'/%3E%3C/svg%3E`;
  const autumnLeaf = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='14' viewBox='0 0 16 14'%3E%3Cpath fill='%23c26b42' d='M8 0C12 2 16 6 14 10C12 14 8 14 8 14C8 14 4 14 2 10C0 6 4 2 8 0Z'/%3E%3C/svg%3E`;
  const rainDrop = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='12' viewBox='0 0 8 12'%3E%3Cpath fill='rgba(150,180,200,0.6)' d='M4 0C4 0 0 6 0 9C0 11.2 1.8 13 4 13C6.2 13 8 11.2 8 9C8 6 4 0 4 0Z'/%3E%3C/svg%3E`;

  let css = "";

  if (preset === "sakura") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: url("${sakuraPetal}"), url("${sakuraPetal}");
        background-position: top 10px right 10px, bottom 15px left 15px;
        background-repeat: no-repeat;
        background-size: 14px 18px, 10px 14px;
        opacity: 0;
        animation: fade-in-nature 3s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  } else if (preset === "autumn") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: url("${autumnLeaf}"), url("${autumnLeaf}");
        background-position: bottom 10px right 20px, bottom 20px left 10px;
        background-repeat: no-repeat;
        background-size: 16px 14px, 12px 10px;
        opacity: 0;
        animation: fade-in-nature 3s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  } else if (preset === "rain") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: url("${rainDrop}"), url("${rainDrop}"), url("${rainDrop}");
        background-position: top 20% left 10%, top 50% right 15%, bottom 20% left 40%;
        background-repeat: no-repeat;
        background-size: 6px 10px, 8px 12px, 5px 8px;
        opacity: 0;
        animation: fade-in-nature 3s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  } else if (preset === "snow") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-top: 2px solid rgba(255, 255, 255, 0.4);
        box-shadow: inset 0 10px 20px -10px rgba(255, 255, 255, 0.3);
        opacity: 0;
        animation: fade-in-nature 4s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  } else if (preset === "mist") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: -2px;
        pointer-events: none;
        box-shadow: inset 0 0 30px rgba(255,255,255,0.15);
        opacity: 0;
        animation: fade-in-nature 5s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  } else if (preset === "fireflies") {
    css = `
      [data-nature-surface]::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: radial-gradient(circle at top 10px right 10px, rgba(255,234,148,0.8) 0%, transparent 6px),
                          radial-gradient(circle at bottom 20px left 15px, rgba(255,234,148,0.6) 0%, transparent 4px);
        opacity: 0;
        animation: fade-in-nature 3s ease forwards;
        z-index: 10;
        border-radius: inherit;
      }
    `;
  }

  return (
    <style suppressHydrationWarning>{`
      @media (prefers-reduced-motion: no-preference) {
        @keyframes fade-in-nature {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      }
      ${css}
    `}</style>
  );
}
