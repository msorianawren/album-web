import { test, expect } from "@playwright/test";

test.describe("Quiet Meadow Rewards", () => {
  test("Guest sees practice mode and cannot earn rewards", async ({ page }) => {
    // Intercept to ensure zero calls
    let sessionCalls = 0;
    await page.route("/api/game-sessions**", route => {
      sessionCalls++;
      return route.continue();
    });

    await page.goto("/games/quiet-meadow");
    const route = page.locator('[data-game-route="quiet-meadow"]');
    await expect(route).toHaveAttribute("data-engine-status", "ready", { timeout: 15_000 });
    
    // Check practice mode notice
    await expect(page.locator("text=Practice mode")).toBeVisible();
    
    // Start game
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(route).toHaveAttribute("data-engine-status", "running");
    
    // Perform a few actions
    await page.locator('button[role="gridcell"]').first().click();
    await page.locator('button[role="gridcell"]').nth(1).click({ button: 'right' }); // Flag
    
    // Pause
    await page.keyboard.press("Escape");
    await expect(route).toHaveAttribute("data-engine-status", "paused");
    
    // Resume
    await page.getByRole("button", { name: "Resume" }).click();
    
    expect(sessionCalls).toBe(0);
  });

  // Note: Authenticated testing requires a seeded database user and session cookie which
  // is typically handled by a global setup or fixture in Playwright. We assume it's
  // configured for the main test suite but leave this placeholder for the pilot.
  
  test("Mobile layout constraints", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    try {
      await page.goto("/games/quiet-meadow");
      const routeNode = page.locator('[data-game-route="quiet-meadow"]');
      await expect(routeNode).toHaveAttribute("data-engine-status", "ready", { timeout: 15_000 });
      
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await page.getByRole("button", { name: "Start", exact: true }).tap();
      await expect(routeNode).toHaveAttribute("data-engine-status", "running");
      
      // Test flag mode toggle
      await page.getByRole("button", { name: "Flag Mode: OFF" }).tap();
      await expect(page.getByRole("button", { name: "Flag Mode: ON" })).toBeVisible();
      
      // Tapping should now place a flag
      await page.locator('button[role="gridcell"]').first().tap();
      await expect(page.locator('button[role="gridcell"]').first()).toHaveAttribute("aria-label", "Flagged");
    } finally {
      await context.close();
    }
  });
});
