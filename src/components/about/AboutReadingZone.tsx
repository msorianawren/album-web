"use client";

import { useMemo, type ReactNode } from "react";
import { AboutVeil } from "./AboutVeil";
import { createAboutVeilTokens, type VeilVariant } from "@/lib/about/create-about-veil-tokens";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import { resolveActiveEnvironment } from "@/lib/environment/resolve-active-environment";

interface AboutReadingZoneProps {
  variant?: VeilVariant;
  className?: string;
  children: ReactNode;
  as?: React.ElementType;
  enabled?: boolean;
}

export function AboutReadingZone({
  variant = "body",
  className = "",
  children,
  as: Component = "div",
  enabled = true
}: AboutReadingZoneProps) {
  const { preferences } = useEnvironmentPreferences();
  const phase = useResolvedEnvironmentPhase(preferences.phase);
  
  const tokens = useMemo(() => {
    if (!enabled) return {};
    const { state } = resolveActiveEnvironment({ ...preferences, phase });
    return createAboutVeilTokens(state, preferences.brightness, variant);
  }, [preferences, phase, variant, enabled]);

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
