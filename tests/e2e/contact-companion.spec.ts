import { expect, test, type Page } from "@playwright/test";

function companionPreferences(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    character: "capybara",
    presence: "on_demand",
    helpLevel: "essential",
    motion: "gentle",
    soundEnabled: false,
    loadingFeedbackEnabled: false,
    contextHintsEnabled: false,
    idleReactionsEnabled: false,
    ...overrides,
  };
}

async function setGuestCompanionPreferences(page: Page, overrides: Record<string, unknown>) {
  await page.addInitScript((preferences) => {
    window.localStorage.setItem("oriana.assistant.preferences.v2", JSON.stringify(preferences));
  }, companionPreferences(overrides));
}

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

test("Hidden is persisted for guests and removes every runtime entry except settings", async ({ page }) => {
  await page.goto("/profile");
  const hiddenPreset = page.getByTestId("companion-preset-hidden");
  await hiddenPreset.click();
  await expect(hiddenPreset).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await page.goto("/contact");
  await page.getByRole("button", { name: "Open user menu" }).click();
  await expect(page.getByRole("button", { name: "Ask Oriana Companion" })).toHaveCount(0);
  await expect(page.getByTestId("oriana-companion-dock")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Open user menu" }).click();
  await expect(page.getByRole("button", { name: "Ask Oriana Companion" })).toHaveCount(0);
});

test("Profile playground gives every selected state a visible cue without overflowing settings", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.locator("#oriana-companion")).toHaveAttribute("data-companion-hydrated", "true");
  const thinking = page.getByTestId("companion-preview-thinking");
  await thinking.click();
  await expect(thinking).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("aside[data-companion-state='thinking']")).toBeVisible();
  await expect(page.locator("[data-companion-cue='think']")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("On demand has no dock while its explicit menu trigger remains useful", async ({ page }) => {
  await setGuestCompanionPreferences(page, { presence: "on_demand", motion: "lively" });
  await page.goto("/contact");
  await expect(page.getByTestId("oriana-companion-dock")).toHaveCount(0);
  await openCompanion(page);
  await expect(page.getByTestId("oriana-companion-panel")).toBeVisible();
});

test("Helpful opens only after a qualifying contextual event", async ({ page }) => {
  await setGuestCompanionPreferences(page, {
    presence: "contextual",
    helpLevel: "helpful",
    contextHintsEnabled: true,
    loadingFeedbackEnabled: true,
  });
  await page.goto("/contact");
  await expect(page.locator("body")).toHaveAttribute("data-oriana-companion-runtime", "ready");
  await expect(page.getByTestId("oriana-companion-dock")).toHaveCount(0);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("oriana-companion-context", { detail: { kind: "form_invalid" } }));
  });
  await expect(page.getByTestId("oriana-companion-panel")).toBeVisible();
});

test("Playful dock suspends for the media viewer and game runtime then restores", async ({ page }) => {
  await setGuestCompanionPreferences(page, {
    presence: "dock",
    helpLevel: "proactive",
    motion: "lively",
    contextHintsEnabled: true,
    loadingFeedbackEnabled: true,
    idleReactionsEnabled: true,
  });
  await page.goto("/contact");
  const dock = page.getByTestId("oriana-companion-dock");
  await expect(dock).toBeVisible();

  await page.evaluate(() => {
    document.body.dataset.orianaMediaViewerOpen = "true";
    window.dispatchEvent(new Event("oriana-media-viewer-state"));
  });
  await expect(dock).toHaveCount(0);
  await page.evaluate(() => {
    document.body.dataset.orianaMediaViewerOpen = "false";
    window.dispatchEvent(new Event("oriana-media-viewer-state"));
  });
  await expect(dock).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.dataset.gameRuntimeSuspended = "true";
    window.dispatchEvent(new Event("oriana-game-runtime-state"));
  });
  await expect(dock).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.dataset.gameRuntimeSuspended = "false";
    window.dispatchEvent(new Event("oriana-game-runtime-state"));
  });
  await expect(dock).toBeVisible();
});

test("Reduced Motion resolves the dock visual to still and failed artwork falls back", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setGuestCompanionPreferences(page, {
    presence: "dock",
    helpLevel: "proactive",
    motion: "lively",
    contextHintsEnabled: true,
  });
  await page.goto("/contact");
  const image = page.getByTestId("oriana-companion-dock").locator("img");
  await expect(image).toHaveCount(1);
  await expect(image.locator("xpath=..")).toHaveAttribute("data-companion-motion", "still");
  await image.evaluate((node) => {
    node.setAttribute("src", "/assistant/companion-v2/missing.webp");
    node.dispatchEvent(new Event("error"));
  });
  await expect(image).toHaveAttribute("src", /\/assistant\/companion-v2\/mira\/idle\.webp/);
});
