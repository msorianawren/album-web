import { expect, test } from "@playwright/test";

const publicAlbumPath = "/albums/where-morning-lingers";

test("timeline uses document scrolling and localizes its date controls", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "vi",
      url: "http://localhost:3000",
    },
  ]);
  await page.goto(publicAlbumPath);

  const timelineView = page.getByRole("button", { name: "Theo thời gian" });
  await expect(timelineView).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Ngày chụp, mới nhất" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Thứ Ba, 7 tháng 7, 2026")).toBeVisible();

  const timeline = page.locator("#media-timeline");
  await expect(timeline).toBeVisible();
  expect(
    await timeline.evaluate((element) => getComputedStyle(element).overflowY),
  ).not.toMatch(/auto|scroll/);

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test("curated grid remains a separate persisted album view", async ({ page }) => {
  await page.goto(publicAlbumPath);

  const curatedView = page.getByRole("button", { name: "Curated grid" });
  await curatedView.click();
  await expect(curatedView).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Photo timeline" })).toBeHidden();
  await expect(page.locator('[data-media-index="0"]').first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Curated grid" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("region", { name: "Photo timeline" })).toBeHidden();
});
