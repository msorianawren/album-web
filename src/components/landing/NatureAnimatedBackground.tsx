"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUIPreferences } from "@/hooks/useUIPreferences";
import { imageStore } from "@/lib/idb";
import type { LandingBackgroundSettings } from "@/lib/types";

const defaultBackgroundSettings: LandingBackgroundSettings = {
  enabled: true,
  preset: "mist",
  intensity: 50,
  opacity: 45,
  speed: 50,
  density: 50,
  blur: 2,
  accent_color_1: null,
  accent_color_2: null,
  custom_url: null,
  apply_to_all_public_pages: true,
  reduce_animations_on_mobile: true,
};

export const ENVIRONMENT_ARTIST_CONFIG_EVENT = "oriana-environment-artist-config";

export function NatureAnimatedBackground({ config }: { config?: Partial<LandingBackgroundSettings> }) {
  const pathname = usePathname();
  const resolvedConfig = { ...defaultBackgroundSettings, ...config };
  const { bgCustomUrlOverride } = useUIPreferences();
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const customVideoRef = useRef<HTMLVideoElement>(null);
  const appliesHere = resolvedConfig.apply_to_all_public_pages || pathname === "/";

  useEffect(() => {
    if (!bgCustomUrlOverride) return;
    let current = true;
    void imageStore.get("custom_background").then((value) => {
      if (current) setCustomImageUrl(value ?? null);
    });
    return () => { current = false; };
  }, [bgCustomUrlOverride]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const synchronize = () => {
      setReducedMotion(motion.matches);
      setDocumentVisible(!document.hidden);
    };
    synchronize();
    motion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      motion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.environmentArtistPreset = resolvedConfig.preset;
    root.dataset.environmentEnabled = resolvedConfig.enabled !== false && appliesHere ? "true" : "false";
    root.style.setProperty("--environment-artist-opacity", String(resolvedConfig.opacity / 100));
    root.style.setProperty("--environment-artist-density", String(resolvedConfig.density / 100));
    root.style.setProperty("--preset-accent", resolvedConfig.accent_color_1 ?? "rgba(168, 150, 130, .32)");
    root.style.setProperty("--preset-hover-bg", resolvedConfig.accent_color_2 ?? "rgba(255, 255, 255, .05)");
    window.dispatchEvent(new CustomEvent(ENVIRONMENT_ARTIST_CONFIG_EVENT));
  }, [appliesHere, resolvedConfig.accent_color_1, resolvedConfig.accent_color_2, resolvedConfig.density, resolvedConfig.enabled, resolvedConfig.opacity, resolvedConfig.preset]);

  useEffect(() => {
    const video = customVideoRef.current;
    if (!video) return;
    const synchronize = () => {
      if (reducedMotion || !documentVisible) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        // A custom background remains optional when autoplay is unavailable.
      });
    };
    synchronize();
    video.addEventListener("canplay", synchronize);
    return () => video.removeEventListener("canplay", synchronize);
  }, [customImageUrl, documentVisible, reducedMotion]);

  const customUrl = bgCustomUrlOverride ? customImageUrl : resolvedConfig.custom_url;
  const enabled = resolvedConfig.enabled !== false && appliesHere;

  return (
    <>
      <span className="environment-document-anchor environment-document-anchor--hero" data-environment-anchor="hero-right" data-bird-perch="branch" aria-hidden="true" />
      <span className="environment-document-anchor environment-document-anchor--archive" data-environment-anchor="archive-left" data-bird-perch="section-edge" aria-hidden="true" />
      <span className="environment-document-anchor environment-document-anchor--story" data-environment-anchor="story-right" data-bird-perch="branch" aria-hidden="true" />
      <span className="environment-document-anchor environment-document-anchor--footer" data-environment-anchor="footer-branch" data-bird-perch="section-edge" aria-hidden="true" />
      {enabled && customUrl ? (
        <div className="environment-custom-background" aria-hidden="true">
          {customUrl.match(/\.(mp4|webm)$/i) || customUrl.startsWith("data:video") ? (
            <video ref={customVideoRef} src={customUrl} autoPlay={!reducedMotion && documentVisible} loop muted playsInline />
          ) : (
            <Image src={customUrl} alt="" fill sizes="100vw" unoptimized />
          )}
        </div>
      ) : null}
    </>
  );
}
