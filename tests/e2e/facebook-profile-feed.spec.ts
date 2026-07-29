import { expect, test } from "@playwright/test";

const feedUrl = process.env.E2E_FACEBOOK_FEED_URL;
const playbackMode = process.env.E2E_FACEBOOK_PLAYBACK_MODE ?? "facebook_embed";

test.describe("Facebook professional-profile feed", () => {
  test.skip(!feedUrl, "Set E2E_FACEBOOK_FEED_URL to a preview URL with one enabled curated item.");

  test("plays native video in-place or retains the Facebook fallback, traps focus, and stays within a mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true });
    const page = await context.newPage();
    try {
      await page.route("https://www.facebook.com/plugins/**", async (route) => {
        await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Facebook embed fixture</title>" });
      });
      await page.goto(feedUrl!);
      const play = page.getByRole("button", { name: /^Play / }).first();
      await expect(play).toBeVisible();
      await expect(page.locator('iframe[title]')).toHaveCount(0);
      await expect(page.getByTestId("native-video-player")).toHaveCount(0);
      const hostnameBeforePlay = new URL(page.url()).hostname;
      let popups = 0;
      page.on("popup", () => { popups += 1; });
      await play.click();

      const dialog = page.getByTestId("facebook-video-dialog");
      await expect(dialog).toBeVisible();
      if (playbackMode === "native") {
        const video = dialog.getByTestId("native-video-player");
        await expect(video).toHaveCount(1);
        await expect(video).toHaveAttribute("controls", "");
        await expect(video).toHaveAttribute("playsinline", "");
        await expect(dialog.locator("iframe")).toHaveCount(0);
        expect(new URL(page.url()).hostname).toBe(hostnameBeforePlay);
        expect(popups).toBe(0);
        const source = await video.locator("source").getAttribute("src");
        expect(source).toBeTruthy();
        const mediaUrl = new URL(source!, page.url());
        expect(mediaUrl.hostname).not.toBe(hostnameBeforePlay);
        expect(mediaUrl.hostname).not.toMatch(/supabase/i);
        expect(mediaUrl.pathname).toContain("/landing/facebook-feed/videos/");
        await expect.poll(() => page.evaluate((url) => performance.getEntriesByType("resource").some((entry) => entry.name === url), mediaUrl.toString())).toBe(true);
      } else {
        await expect(dialog.locator("iframe")).toHaveCount(1);
      }
      await expect(dialog.getByRole("link", { name: "View original on Facebook" })).toBeVisible();
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("link", { name: "View original on Facebook" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(dialog.getByRole("button", { name: "Close video player" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(play).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await context.close();
    }
  });
});
