import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "The visual environment matrix runs in Chromium to keep the WebGL scene deterministic.");
});

const preferences = (preset: string, phase: string) => ({
  version: 2,
  preset,
  phase,
  windSpeed: 34,
  gustStrength: 42,
  gustFrequency: 30,
  turbulence: 24,
  branchSway: 48,
  environmentDensity: 52,
  particleAmount: 46,
  atmosphere: 42,
  spatialDepth: 68,
  brightness: 100,
  birdDensity: 36,
  birdSongFrequency: 24,
  chimeVolume: 66,
  autoChimeFrequency: 32,
  precipitationAmount: 50,
  wetness: 60,
  dropletAmount: 45,
});

async function setEnvironment(page: Page, preset: string, phase: string) {
  await page.evaluate((value) => {
    window.localStorage.setItem("oriana_environment_preferences_v2", JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("oriana-environment-preferences-change"));
  }, preferences(preset, phase));
}

test("resolves every environment state through the v2 storage key", async ({ page }) => {
  await page.goto("/about");
  const main = page.locator('main[data-about-readability="v2"]');

  for (const preset of ["sakura", "fireflies", "snow", "autumn", "mist", "rain"]) {
    for (const phase of ["day", "sunset", "night"]) {
      await setEnvironment(page, preset, phase);
      await expect(main).toHaveAttribute("data-about-preset", preset);
      await expect(main).toHaveAttribute("data-about-phase", phase);
      await expect(main.locator("[data-about-reading-veil]").first()).toHaveCount(1);
    }
  }
});

test("About reading zones stay contained across target responsive viewports", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/about");
    const main = page.locator('main[data-about-readability="v2"]');
    await setEnvironment(page, "sakura", "day");
    await expect(main).toHaveAttribute("data-about-preset", "sakura");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
