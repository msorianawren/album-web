import { expect, test } from "@playwright/test";

const publicAlbumPath = "/albums/where-morning-lingers";

test("public viewer deep-links media, navigates, and closes back to the album", async ({ page }) => {
  await page.goto(publicAlbumPath);
  await expect(page.locator('[data-media-index="0"]').first()).toBeVisible();
  await expect(page.locator(".public-chime-canvas")).toBeAttached();
  await expect.poll(() => page.getByRole("button", { name: "Play the wind chime" }).count()).toBeGreaterThan(0);

  await page.locator('[data-media-index="0"]').first().click();
  const viewer = page.getByRole("dialog", { name: "Media viewer" });
  await expect(viewer).toBeVisible();
  await expect(page).toHaveURL(/\?media=[0-9a-f-]{36}$/i);

  const firstUrl = page.url();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.url()).not.toBe(firstUrl);
  await expect(viewer.getByRole("slider", { name: "Browse album timeline" })).toBeVisible();

  await viewer.locator("[data-viewer-gesture-surface]").click();
  await expect(viewer.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer.getByRole("slider", { name: "Browse album timeline" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${publicAlbumPath.replace("/", "\\/")}$`));
});

test("viewer remains usable at a mobile viewport without horizontal overflow", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto(publicAlbumPath);
    await expect(page.locator('[data-media-index="0"]').first()).toBeVisible();
    await page.locator('[data-media-index="0"]').first().tap();

    const viewer = page.getByRole("dialog", { name: "Media viewer" });
    await expect(viewer).toBeVisible();
    await page.getByRole("button", { name: "Toggle media information" }).tap();
    await expect(page.getByRole("complementary", { name: "Media information" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});
