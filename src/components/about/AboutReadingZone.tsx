"use client";

import { type ReactNode } from "react";
import { AboutVeil } from "./AboutVeil";
import { type VeilVariant } from "@/lib/about/create-about-veil-tokens";

interface AboutReadingZoneProps {
  variant?: VeilVariant;
  className?: string;
  children: ReactNode;
  as?: React.ElementType;
  tokens?: Record<string, string>;
}

export function AboutReadingZone({
  className = "",
  children,
  as: Component = "div",
  enabled = true,
  tokens = {}
}: AboutReadingZoneProps) {

  if (!enabled) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <Component 
      className={`relative z-10 isolate ${className}`} 
      style={{
        ...tokens,
        color: "var(--about-text-primary)"
      }}
    >
      <AboutVeil tokens={tokens} />
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  );
}
