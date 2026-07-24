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

test("About Veil Tokens: 18 environments maintain strict contrast", () => {
  const phases = ["day", "sunset", "night"];
  const variants = ["hero", "body", "quote", "compact"];
  
  for (const state of Object.values(ENVIRONMENT_STATE_REGISTRY)) {
    for (const variant of variants) {
      const tokens = createAboutVeilTokens(state, 1, variant);
        
        const primaryTextStr = tokens["--about-text-primary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const secondaryTextStr = tokens["--about-text-secondary"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        const baseVeilStr = tokens["--about-veil-base"].match(/rgb\((\d+) (\d+) (\d+)\)/);
        
        assert.ok(primaryTextStr, `Primary text token missing for ${state.preset} ${state.phase} ${variant}`);
        assert.ok(secondaryTextStr, `Secondary text token missing for ${state.preset} ${state.phase} ${variant}`);
        assert.ok(baseVeilStr, `Base veil token missing for ${state.preset} ${state.phase} ${variant}`);
        
        const primaryL = getLuminance(Number(primaryTextStr[1]), Number(primaryTextStr[2]), Number(primaryTextStr[3]));
        const secondaryL = getLuminance(Number(secondaryTextStr[1]), Number(secondaryTextStr[2]), Number(secondaryTextStr[3]));
        const baseL = getLuminance(Number(baseVeilStr[1]), Number(baseVeilStr[2]), Number(baseVeilStr[3]));
        
        const primaryContrast = getContrast(primaryL, baseL);
        const secondaryContrast = getContrast(secondaryL, baseL);
        
        assert.ok(primaryContrast >= 4.5, `Primary contrast ${primaryContrast.toFixed(2)} < 4.5 for ${state.preset} ${state.phase} ${variant}`);
        assert.ok(secondaryContrast >= 4.5, `Secondary contrast ${secondaryContrast.toFixed(2)} < 4.5 for ${state.preset} ${state.phase} ${variant}`);
      }
  }
});
