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

function mixRgb(c1, c2, weight) {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: Math.round(c1.r * w + c2.r * (1 - w)),
    g: Math.round(c1.g * w + c2.g * (1 - w)),
    b: Math.round(c1.b * w + c2.b * (1 - w))
  };
}

test("About Veil Tokens: Guarantees text contrast across all brightness levels", () => {
  const variants = ["hero", "body", "quote", "compact"];
  const brightnessLevels = [60, 100, 140];
  
  for (const state of Object.values(ENVIRONMENT_STATE_REGISTRY)) {
    for (const variant of variants) {
      for (const brightness of brightnessLevels) {
        const tokens = createAboutVeilTokens(state, brightness, variant);
          
        const primaryMatch = tokens["--about-text-primary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const secondaryMatch = tokens["--about-text-secondary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const mutedMatch = tokens["--about-text-muted"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const faintMatch = tokens["--about-text-faint"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        
        // Extract the center color and alpha from the radial gradient
        const surfaceMatch = tokens["--about-veil-surface"].match(/rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
        
        assert.ok(primaryMatch);
        assert.ok(secondaryMatch);
        assert.ok(mutedMatch);
        assert.ok(faintMatch);
        assert.ok(surfaceMatch);
        
        const primary = { r: Number(primaryMatch[1]), g: Number(primaryMatch[2]), b: Number(primaryMatch[3]) };
        const secondary = { r: Number(secondaryMatch[1]), g: Number(secondaryMatch[2]), b: Number(secondaryMatch[3]) };
        const muted = { r: Number(mutedMatch[1]), g: Number(mutedMatch[2]), b: Number(mutedMatch[3]) };
        const faint = { r: Number(faintMatch[1]), g: Number(faintMatch[2]), b: Number(faintMatch[3]) };
        
        const base = { r: Number(surfaceMatch[1]), g: Number(surfaceMatch[2]), b: Number(surfaceMatch[3]) };
        const alpha = Number(surfaceMatch[4]);
        
        const clearHex = state.clearColor;
        const r = parseInt(clearHex.slice(1, 3), 16);
        const g = parseInt(clearHex.slice(3, 5), 16);
        const b = parseInt(clearHex.slice(5, 7), 16);
        const clear = { r, g, b };
        
        // Calculate the actual perceived background by alpha compositing the surface over the clear color
        const perceivedBg = mixRgb(base, clear, alpha);
        const perceivedL = getLuminance(perceivedBg.r, perceivedBg.g, perceivedBg.b);
        
        const primaryL = getLuminance(primary.r, primary.g, primary.b);
        const secondaryL = getLuminance(secondary.r, secondary.g, secondary.b);
        const mutedL = getLuminance(muted.r, muted.g, muted.b);
        const faintL = getLuminance(faint.r, faint.g, faint.b);
        
        const primaryContrast = getContrast(primaryL, perceivedL);
        const secondaryContrast = getContrast(secondaryL, perceivedL);
        const mutedContrast = getContrast(mutedL, perceivedL);
        const faintContrast = getContrast(faintL, perceivedL);
        
        assert.ok(primaryContrast >= 4.5, `Primary contrast ${primaryContrast.toFixed(2)} fails for ${state.preset} ${state.phase} ${variant} at ${brightness}% brightness`);
        assert.ok(secondaryContrast >= 4.5, `Secondary contrast ${secondaryContrast.toFixed(2)} fails for ${state.preset} ${state.phase} ${variant} at ${brightness}% brightness`);
        assert.ok(mutedContrast >= 4.5, `Muted contrast ${mutedContrast.toFixed(2)} fails for ${state.preset} ${state.phase} ${variant} at ${brightness}% brightness`);
        assert.ok(faintContrast >= 3.0, `Faint contrast ${faintContrast.toFixed(2)} fails for ${state.preset} ${state.phase} ${variant} at ${brightness}% brightness`);
      }
    }
  }
});
