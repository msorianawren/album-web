import type { CSSProperties } from "react";
import type { EnvironmentState } from "@/lib/environment/presets";

type Rgb = readonly [number, number, number];

export type AboutReadabilityTokens = CSSProperties & {
  "--about-reading-surface": string;
  "--about-reading-text": string;
  "--about-reading-secondary": string;
  "--about-reading-accent": string;
};

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  const weight = Math.max(0, Math.min(1, amount));
  return [
    Math.round(from[0] + (to[0] - from[0]) * weight),
    Math.round(from[1] + (to[1] - from[1]) * weight),
    Math.round(from[2] + (to[2] - from[2]) * weight),
  ];
}

function luminance([red, green, blue]: Rgb) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function toCssRgb([red, green, blue]: Rgb) {
  return `rgb(${red} ${green} ${blue})`;
}

export function createAboutReadabilityTokens(
  environment: EnvironmentState,
  brightness: number,
): AboutReadabilityTokens {
  const clear = hexToRgb(environment.clearColor);
  const fog = hexToRgb(environment.fogColor);
  const accent = mixRgb(hexToRgb(environment.particle[0]), hexToRgb(environment.keyLight), 0.42);
  const isDarkEnvironment = luminance(clear) < 0.22;
  const brightnessBias = Math.max(-0.06, Math.min(0.06, (brightness - 100) / 650));
  const baseSurface: Rgb = isDarkEnvironment ? [19, 27, 36] : [252, 248, 241];
  const surface = mixRgb(baseSurface, fog, isDarkEnvironment ? 0.16 - brightnessBias : 0.12 + brightnessBias);

  return {
    "--about-reading-surface": toCssRgb(surface),
    "--about-reading-text": toCssRgb(isDarkEnvironment ? [250, 247, 241] : [38, 31, 27]),
    "--about-reading-secondary": toCssRgb(isDarkEnvironment ? [229, 225, 217] : [81, 70, 62]),
    "--about-reading-accent": toCssRgb(accent),
  };
}
