import { expect, test } from "@playwright/test";

const canaries = ["snake", "feather-merge", "memory-garden"];

test("Game Hub publishes cards only for playable routes", async ({ page }) => {
  await page.goto("/games");
  for (const slug of [...canaries, "puzzle-atelier"]) {
    const card = page.locator(`[data-game-card="${slug}"]`);
    await expect(card).toHaveAttribute("data-game-status", "published");
    await expect(card).toHaveAttribute("href", `/games/${slug}`);
  }
});

for (const slug of canaries) {
  test(`${slug} loads and starts without API traffic`, async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) apiRequests.push(request.url());
    });
    await page.goto(`/games/${slug}`);
    const route = page.locator(`[data-game-route="${slug}"]`);
    await expect(route).toHaveAttribute("data-game-version", "1.0.0");
    await expect(route).toHaveAttribute("data-engine-status", "ready", { timeout: 15_000 });
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(route).toHaveAttribute("data-engine-status", "running");
    await expect(page.locator("html")).toHaveAttribute("data-game-runtime-suspended", "true");
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(route).toHaveAttribute("data-engine-status", "paused");
    await expect(page.locator("html")).toHaveAttribute("data-game-runtime-suspended", "false");
    expect(apiRequests).toEqual([]);
  });
}

test("Game Hub and Snake remain usable on a mobile viewport", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto("/games");

    await expect(page.locator('[data-game-card][data-game-status="published"]')).toHaveCount(5);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto("/games/snake");
    const route = page.locator('[data-game-route="snake"]');
    await expect(route).toHaveAttribute("data-engine-status", "ready", { timeout: 15_000 });
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await expect(route).toHaveAttribute("data-engine-status", "running");
    await expect(page.locator("html")).toHaveAttribute("data-game-runtime-suspended", "true");
    await page.getByRole("button", { name: "Move right" }).tap();
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    await expect(route).toHaveAttribute("data-engine-status", "paused");
    await expect(page.locator("html")).toHaveAttribute("data-game-runtime-suspended", "false");
  } finally {
    await context.close();
  }
});
