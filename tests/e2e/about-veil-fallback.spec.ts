import { test, expect } from '@playwright/test';

test.describe('About Veil Fallback Mode', () => {
  test('does not enable the veil when the flag is disabled', async ({ page }) => {
    // Navigate to the about page
    await page.goto('/about');

    // Wait for main content to load
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Verify the flag attribute is correctly set to false
    await expect(main).toHaveAttribute('data-aurora-veil-enabled', 'false');

    // Verify that AboutVeil decorative elements are absent
    const veilSurfaces = page.locator('.about-veil-surface');
    await expect(veilSurfaces).toHaveCount(0);
  });
});
