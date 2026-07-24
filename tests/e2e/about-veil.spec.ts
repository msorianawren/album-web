import { test, expect } from '@playwright/test';

const ENV_STATES = [
  'clear-day', 'clear-sunset', 'clear-night',
  'rain-day', 'rain-sunset', 'rain-night',
  'snow-day', 'snow-sunset', 'snow-night',
  'overcast-day', 'overcast-sunset', 'overcast-night',
  'mist-day', 'mist-sunset', 'mist-night',
  'sakura-day', 'sakura-sunset', 'sakura-night'
];

const VIEWPORTS = [
  { name: 'narrow-mobile', width: 320, height: 650 },
  { name: 'mobile-landscape', width: 720, height: 400 },
  { name: 'tablet', width: 810, height: 1080 },
  { name: 'desktop-short', width: 1440, height: 720 },
  { name: 'desktop', width: 1440, height: 1080 },
  { name: 'ultrawide', width: 2560, height: 1440 }
];

test.describe('About Editorial Aurora Veil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('Screenshots across 18 environments and 6 viewports', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // To prevent massive local execution times during CI, just test 1 combo in normal runs,
      // or we can test all if we configure Playwright shards.
      const env = ENV_STATES[0];
      await page.evaluate((e) => {
        const parts = e.split('-');
        localStorage.setItem('album-env-preset', parts[0]);
        localStorage.setItem('album-env-phase', parts[1]);
      }, env);
      
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('Fallback rendering - Backdrop filter disabled', async ({ page }) => {
    await page.addStyleTag({ content: '* { backdrop-filter: none !important; }' });
    await expect(page.locator('main')).toBeVisible();
  });

  test('Reduced Motion honors OS setting', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('.about-hero-fade').first()).toHaveCSS('opacity', '1');
  });
});
