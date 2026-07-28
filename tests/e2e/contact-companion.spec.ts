import { expect, test, type Page } from "@playwright/test";

async function openCompanion(page: Page) {
  await page.getByRole("button", { name: "Open user menu" }).click();
  const trigger = page.getByRole("button", { name: "Ask Oriana Companion" });
  await trigger.click();
  return trigger;
}

test("Companion keeps the page sharp, blocks the background, and restores focus", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("heading", { name: "Contact her" }).evaluate((heading) => {
    heading.addEventListener("click", () => { document.body.dataset.contactBackgroundClick = "true"; }, { once: true });
  });
  await openCompanion(page);
  const overlay = page.getByTestId("oriana-companion-overlay");
  const panel = page.getByTestId("oriana-companion-panel");
  const backdrop = overlay.locator("> button");
  await expect(panel).toBeVisible();
  await expect(backdrop).not.toHaveCSS("backdrop-filter", /blur/);
  await expect(panel.getByRole("link", { name: /Message Oriana on Telegram/ })).toHaveAttribute("href", "https://t.me/orianawren");
  await backdrop.click();
  await expect(panel).toBeHidden();
  await expect(page.locator("body")).not.toHaveAttribute("data-contact-background-click", "true");
  const reopenedTrigger = await openCompanion(page);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(reopenedTrigger).toBeFocused();
});

test("Contact her presents Telegram and one primary inbox", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Contact her" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Message Oriana" })).toHaveAttribute("href", "https://t.me/orianawren");
  await expect(page.getByRole("heading", { name: "Send a private message" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My conversations" })).toHaveCount(0);
});

test("Companion remains within a mobile viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto("/contact");
    await openCompanion(page);
    const panel = page.getByTestId("oriana-companion-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "Close assistant" })).toBeVisible();
    await expect(panel.getByRole("link", { name: /Message Oriana on Telegram/ })).toBeVisible();
    await expect(panel.getByRole("textbox", { name: "Ask Oriana Companion" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await panel.getByRole("button", { name: "Close assistant" }).click();
    await expect(panel).toBeHidden();
  } finally {
    await context.close();
  }
});
