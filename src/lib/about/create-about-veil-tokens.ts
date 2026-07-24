import type { EnvironmentState } from "../environment/presets";

export type VeilVariant = "hero" | "body" | "quote" | "compact";

function hexToRgb(hex: string) {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function getLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(lum1: number, lum2: number) {
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function mixRgb(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(c1.r * (1 - t) + c2.r * t),
    g: Math.round(c1.g * (1 - t) + c2.g * t),
    b: Math.round(c1.b * (1 - t) + c2.b * t),
  };
}

export function createAboutVeilTokens(
  state: EnvironmentState,
  brightness: number,
  variant: VeilVariant
) {
  const clear = hexToRgb(state.clearColor);
  const fog = hexToRgb(state.fogColor);
  const key = hexToRgb(state.keyLight);
  const particle = hexToRgb(state.particle[0] || state.keyLight);

  const bgLum = getLuminance(clear);
  const isDarkEnv = bgLum < 0.45;
  
  // Base text color
  const textPrimary = isDarkEnv ? { r: 250, g: 250, b: 250 } : { r: 20, g: 20, b: 20 };
  const textSecondary = isDarkEnv ? { r: 180, g: 180, b: 180 } : { r: 100, g: 100, b: 100 };

  const targetContrast = 4.5;
  const textLum = getLuminance(textSecondary);

  // Generate Veil Base and Accent (Fallback to RGB for CSS)
  let baseRgb = mixRgb(clear, fog, 0.5);
  const accentRgb = mixRgb(key, particle, 0.5);

  // Variant specific alphas
  let centerAlpha = 0.85;
  let middleAlpha = 0.5;
  const outerAlpha = 0.0;
  let blurAmount = 16;
  let ellipseSize = "120% 120%";
  const ellipseOrigin = "50% 50%";
  let gradientPositions = "0%, 60%, 100%";

  switch (variant) {
    case "hero":
      centerAlpha = 0.5;
      middleAlpha = 0.15;
      blurAmount = 24;
      ellipseSize = "150% 130%";
      gradientPositions = "0%, 50%, 100%";
      break;
    case "body":
      centerAlpha = 0.85;
      middleAlpha = 0.45;
      blurAmount = 12;
      ellipseSize = "100% 110%";
      gradientPositions = "20%, 75%, 100%";
      break;
    case "quote":
      centerAlpha = 0.6;
      middleAlpha = 0.25;
      blurAmount = 18;
      ellipseSize = "140% 90%";
      gradientPositions = "0%, 65%, 100%";
      break;
    case "compact":
      centerAlpha = 0.9;
      middleAlpha = 0.6;
      blurAmount = 8;
      ellipseSize = "110% 110%";
      gradientPositions = "10%, 80%, 100%";
      break;
  }

  // Adjust for brightness preference
  const brightnessMod = brightness / 100;
  centerAlpha = Math.min(1, centerAlpha * brightnessMod);
  middleAlpha = Math.min(1, middleAlpha * brightnessMod);

  // Guarantee contrast for the core reading area
  // We approximate the perceived background luminance as a blend of clearColor and baseRgb
  let perceivedBase = mixRgb(clear, baseRgb, centerAlpha);
  let perceivedLum = getLuminance(perceivedBase);
  let iterations = 0;
  const targetBg = isDarkEnv ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

  while ((getContrast(textLum, perceivedLum) < targetContrast || getContrast(textLum, getLuminance(baseRgb)) < targetContrast) && iterations < 20) {
    baseRgb = mixRgb(baseRgb, targetBg, 0.3); // Mix 30% towards pure black/white
    // Increase alpha to help reach contrast without heavily distorting color
    if (centerAlpha < 0.98) {
      centerAlpha = Math.min(1, centerAlpha + 0.04);
    }
    perceivedBase = mixRgb(clear, baseRgb, centerAlpha);
    perceivedLum = getLuminance(perceivedBase);
    iterations++;
  }

  return {
    "--about-text-primary": `rgb(${textPrimary.r} ${textPrimary.g} ${textPrimary.b})`,
    "--about-text-secondary": `rgb(${textSecondary.r} ${textSecondary.g} ${textSecondary.b})`,
    "--about-veil-base": `rgb(${baseRgb.r} ${baseRgb.g} ${baseRgb.b})`,
    "--about-veil-accent": `rgb(${accentRgb.r} ${accentRgb.g} ${accentRgb.b})`,
    "--about-veil-base-center": `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${centerAlpha})`,
    "--about-veil-base-middle": `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${middleAlpha})`,
    "--about-veil-base-outer": `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${outerAlpha})`,
    "--about-veil-gradient-positions": gradientPositions,
    "--about-veil-blur": `${blurAmount}px`,
    "--about-veil-ellipse-size": ellipseSize,
    "--about-veil-ellipse-origin": ellipseOrigin,
  } as React.CSSProperties;
}
