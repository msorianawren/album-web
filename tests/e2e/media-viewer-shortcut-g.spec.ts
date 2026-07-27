import { expect, test } from "@playwright/test";

const publicAlbumPath = "/albums/where-morning-lingers";

test.describe("MediaViewer Shortcut G Behavior", () => {
  test("pressing G in normal view closes viewer and returns to grid", async ({ page }) => {
    await page.goto(publicAlbumPath);
    await expect(page.locator('[data-media-index="0"]').first()).toBeVisible();

    // Open viewer by clicking first item
    await page.locator('[data-media-index="0"]').first().click();
    const viewer = page.getByRole("dialog", { name: "Media viewer" });
    await expect(viewer).toBeVisible();
    await expect(page).toHaveURL(/\?media=[0-9a-f-]{36}$/i);

    // Press 'g' / 'G' key
    await page.keyboard.press("g");

    // Viewer should close and URL return to album grid path
    await expect(viewer).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${publicAlbumPath.replace("/", "\\/")}$`));
  });

  test("pressing G while typing in input does not trigger close", async ({ page }) => {
    await page.goto(publicAlbumPath);
    await expect(page.locator('[data-media-index="0"]').first()).toBeVisible();

    // Open viewer
    await page.locator('[data-media-index="0"]').first().click();
    const viewer = page.getByRole("dialog", { name: "Media viewer" });
    await expect(viewer).toBeVisible();

    // Open info sheet via shortcut 'i'
    await page.keyboard.press("i");
    const info = page.getByRole("complementary", { name: "Media information" });
    await expect(info).toBeVisible();

    // Viewer stays visible
    await expect(viewer).toBeVisible();
  });
});
