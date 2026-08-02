"use client";

import React from "react";

/**
 * Sakura Blossom Corner Flourish
 * Sits in the top-right or top-left corner of a section card
 */
export function SakuraCorner({
  position = "top-right",
  className = "",
}: {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  className?: string;
}) {
  const transform = {
    "top-right": "scaleX(1) scaleY(1)",
    "top-left": "scaleX(-1) scaleY(1)",
    "bottom-right": "scaleX(1) scaleY(-1)",
    "bottom-left": "scaleX(-1) scaleY(-1)",
  }[position];

  const posClass = {
    "top-right": "top-0 right-0",
    "top-left": "top-0 left-0",
    "bottom-right": "bottom-0 right-0",
    "bottom-left": "bottom-0 left-0",
  }[position];

  return (
    <div
      className={`pointer-events-none absolute z-10 select-none opacity-80 transition-opacity duration-500 hover:opacity-100 ${posClass} ${className}`}
      style={{ transform }}
      aria-hidden="true"
    >
      <svg
        width="110"
        height="110"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-muted-accent drop-shadow-sm"
      >
        {/* Branch / Twig */}
        <path
          d="M120 0C100 8 75 14 55 32C42 43 32 58 20 74C12 85 0 95 0 95"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
        <path
          d="M75 18C70 26 62 30 52 32"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
        <path
          d="M38 52C32 58 26 60 18 61"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />

        {/* Blossom 1 - Main Blooming Sakura */}
        <g transform="translate(68, 22)">
          {/* 5 Petals */}
          <path
            d="M0 0C-4 -8 -1 -15 0 -17C1 -15 4 -8 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.85"
          />
          <path
            d="M0 0C8 -5 15 -3 17 -1C15 1 8 5 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.85"
          />
          <path
            d="M0 0C6 7 6 14 4 16C2 14 -1 8 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.85"
          />
          <path
            d="M0 0C-6 7 -13 6 -15 4C-13 2 -7 -1 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.85"
          />
          <path
            d="M0 0C-8 -3 -14 -9 -15 -11C-13 -11 -7 -5 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.85"
          />
          {/* Pistil / Stamen */}
          <circle cx="0" cy="0" r="2.2" fill="#e89cb2" />
          <circle cx="0" cy="0" r="1.1" fill="#f5d76e" />
        </g>

        {/* Blossom 2 - Smaller Sakura Bud */}
        <g transform="translate(32, 60) rotate(25)">
          <path
            d="M0 0C-3 -6 -1 -11 0 -13C1 -11 3 -6 0 0Z"
            fill="url(#sakura-gradient-2)"
            opacity="0.75"
          />
          <path
            d="M0 0C6 -4 11 -2 13 0C11 2 6 4 0 0Z"
            fill="url(#sakura-gradient-2)"
            opacity="0.75"
          />
          <path
            d="M0 0C4 5 4 10 3 12C1 10 -1 6 0 0Z"
            fill="url(#sakura-gradient-2)"
            opacity="0.75"
          />
          <circle cx="0" cy="0" r="1.5" fill="#f5d76e" opacity="0.9" />
        </g>

        {/* Small drifting petal */}
        <g transform="translate(14, 88) rotate(-15)">
          <path
            d="M0 0C-3 -5 0 -9 2 -11C4 -9 5 -4 0 0Z"
            fill="url(#sakura-gradient-1)"
            opacity="0.8"
          />
        </g>
        <g transform="translate(95, 8) rotate(40)">
          <path
            d="M0 0C-2 -4 1 -7 3 -8C4 -6 4 -3 0 0Z"
            fill="url(#sakura-gradient-2)"
            opacity="0.65"
          />
        </g>

        {/* Shared Gradients */}
        <defs>
          <linearGradient id="sakura-gradient-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fce4ec" />
            <stop offset="60%" stopColor="#f8bbd0" />
            <stop offset="100%" stopColor="#f48fb1" />
          </linearGradient>
          <linearGradient id="sakura-gradient-2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff0f5" />
            <stop offset="100%" stopColor="#f8bbd0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Sakura Blossom Header Crest
 * Minimal 5-petal flower icon to accompany section eyebrows / headings
 */
export function SakuraCrest({ className = "" }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 align-middle text-pink-300/90 ${className}`}
      aria-hidden="true"
    >
      {/* 5 Petals */}
      <path d="M12 12C10 5 13 2 14 2C15 2 17 5 12 12Z" fill="url(#crest-sakura-grad)" />
      <path d="M12 12C19 10 22 13 22 14C22 15 19 17 12 12Z" fill="url(#crest-sakura-grad)" />
      <path d="M12 12C14 19 11 22 10 22C9 22 7 19 12 12Z" fill="url(#crest-sakura-grad)" />
      <path d="M12 12C5 14 2 11 2 10C2 9 5 7 12 12Z" fill="url(#crest-sakura-grad)" />
      <path d="M12 12C7 7 6 3 8 2C9 2 11 6 12 12Z" fill="url(#crest-sakura-grad)" />
      {/* Core */}
      <circle cx="12" cy="12" r="2" fill="#f5d76e" />
      <defs>
        <linearGradient id="crest-sakura-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd1dc" />
          <stop offset="100%" stopColor="#f48fb1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Floating Petal Line Motif
 * Subtle organic divider / floral branch line
 */
export function BotanicalLineMotif({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none flex items-center justify-center gap-3 py-2 text-muted-accent/60 ${className}`} aria-hidden="true">
      <svg width="60" height="12" viewBox="0 0 60 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 6H45C50 6 54 4 58 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
        <circle cx="48" cy="6" r="1.5" fill="#f48fb1" opacity="0.8" />
        <circle cx="58" cy="1" r="1" fill="#f5d76e" />
      </svg>
      <SakuraCrest className="h-4 w-4" />
      <svg width="60" height="12" viewBox="0 0 60 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "scaleX(-1)" }}>
        <path d="M0 6H45C50 6 54 4 58 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
        <circle cx="48" cy="6" r="1.5" fill="#f48fb1" opacity="0.8" />
        <circle cx="58" cy="1" r="1" fill="#f5d76e" />
      </svg>
    </div>
  );
}

/**
 * Sakura Petal Floating Pair
 * Placed along card edges for an airy, living natural aesthetic
 */
export function SakuraPetalPair({ className = "" }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none absolute z-10 select-none ${className}`}
      aria-hidden="true"
    >
      <g transform="translate(10, 10) rotate(-20)">
        <path
          d="M0 0C-4 -7 0 -13 3 -15C6 -13 8 -6 0 0Z"
          fill="url(#pair-sakura-1)"
          opacity="0.85"
        />
        <circle cx="1" cy="-7" r="0.8" fill="#fff" opacity="0.6" />
      </g>
      <g transform="translate(26, 22) rotate(45)">
        <path
          d="M0 0C-3 -5 0 -10 2 -11C4 -10 6 -4 0 0Z"
          fill="url(#pair-sakura-1)"
          opacity="0.7"
        />
      </g>
      <defs>
        <linearGradient id="pair-sakura-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe4ec" />
          <stop offset="100%" stopColor="#f48fb1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
