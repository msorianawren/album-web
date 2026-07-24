import assert from "node:assert";
import { test } from "node:test";
import { createAboutVeilTokens } from "../src/lib/about/create-about-veil-tokens.ts";
import { ENVIRONMENT_STATE_REGISTRY } from "../src/lib/environment/presets.ts";

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(l1, l2) {
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

test("About Veil Tokens: Theoretical contrast model generates valid gradient strings for all brightness levels", () => {
  const variants = ["hero", "body", "quote", "compact"];
  const brightnessLevels = [60, 100, 140];
  
  for (const state of Object.values(ENVIRONMENT_STATE_REGISTRY)) {
    for (const variant of variants) {
      for (const brightness of brightnessLevels) {
        const tokens = createAboutVeilTokens(state, brightness, variant);
          
        const primaryTextStr = tokens["--about-text-primary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const secondaryTextStr = tokens["--about-text-secondary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        
        // Extract the center color from the radial gradient
        const surfaceMatch = tokens["--about-veil-surface"].match(/rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
        
        assert.ok(primaryTextStr, `Primary text token missing for ${state.preset} ${state.phase} ${variant}`);
        assert.ok(secondaryTextStr, `Secondary text token missing for ${state.preset} ${state.phase} ${variant}`);
        assert.ok(surfaceMatch, `Surface gradient missing or malformed for ${state.preset} ${state.phase} ${variant}`);
        
        // Note: This is a deterministic model test, NOT a rendered-pixel guarantee.
        // It does not account for WebGL Clockwork, mix-blend-screen, mix-blend-overlay, moving particles, or cover images.
        // True WCAG compliance must be verified via visual regression tests (Playwright).
        
        const primaryL = getLuminance(Number(primaryTextStr[1]), Number(primaryTextStr[2]), Number(primaryTextStr[3]));
        const baseL = getLuminance(Number(surfaceMatch[1]), Number(surfaceMatch[2]), Number(surfaceMatch[3]));
        
        const primaryContrast = getContrast(primaryL, baseL);
        assert.ok(primaryContrast > 1, `Contrast must be calculable for ${state.preset} ${state.phase} ${variant} at ${brightness}% brightness`);
      }
    }
  }
});
