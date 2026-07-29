import { expect, test } from "@playwright/test";

test.describe("Facebook story feed", () => {
  test("keeps a disabled feed absent from the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("facebook-story-tray")).toHaveCount(0);
  });

  test("does not cause horizontal overflow when disabled on a 320px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
