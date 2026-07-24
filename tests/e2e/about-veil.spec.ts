import { test, expect } from '@playwright/test';

const PRESETS = ["default", "fireflies", "autumn", "rain", "mist", "snow"];
const PHASES = ["day", "sunset", "night"];
const VIEWPORTS = [
  { width: 320, height: 568, name: "narrow mobile" },
  { width: 390, height: 844, name: "mobile" },
  { width: 844, height: 390, name: "mobile landscape" },
  { width: 820, height: 1180, name: "tablet" },
  { width: 1440, height: 900, name: "desktop" },
  { width: 1920, height: 1080, name: "short desktop" },
  { width: 3440, height: 1440, name: "ultrawide" },
];

test.describe('About Editorial Aurora Veil', () => {
  for (const preset of PRESETS) {
    for (const phase of PHASES) {
      for (const viewport of VIEWPORTS) {
        test(`Veil visual regression - ${preset} - ${phase} - ${viewport.name}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          // Navigate to the about page with the query params for environment presets if any,
          // assuming testing the flag via environment variables during build
          await page.goto(`/about?env=${preset}&phase=${phase}`);
          await page.waitForLoadState('networkidle');
          
          // Wait for canvas to load and veil to render
          await page.waitForTimeout(1000);
          
          await expect(page).toHaveScreenshot(`about-veil-${preset}-${phase}-${viewport.name.replace(/ /g, '-')}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.05
          });
        });
      }
    }
  }

  // Accessibility and Fallback specific tests on a baseline configuration
  test('Accessibility - 200% Text Resize', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about?env=default&phase=day');
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('about-veil-a11y-200-text.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test('Accessibility - Reduced Motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about?env=default&phase=day');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('about-veil-a11y-reduced-motion.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test('Accessibility - Fallback (No Veil Flag)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Assuming testing fallback by passing a query param or depending on env config,
    // we'll pass ?noVeil=true to simulate a runtime disable, 
    // or test against a known fallback state
    await page.goto('/about?env=default&phase=day&noVeil=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('about-veil-a11y-fallback.png', { fullPage: true, maxDiffPixelRatio: 0.05 });
  });
});
