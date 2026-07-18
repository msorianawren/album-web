const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[contenteditable]",
  "[data-interactive]",
  "[role='dialog']",
  "[data-radix-popper-content-wrapper]",
  "[data-oriana-menu]",
  "[data-oriana-assistant]",
].join(",");

export function isProtectedInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

export function isChimeControlTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-chime-control]"));
}

export function isOverlayInteractionActive() {
  return Array.from(document.querySelectorAll<HTMLElement>("[role='dialog'], [aria-modal='true'], [data-radix-popper-content-wrapper], [data-oriana-menu-open='true'], [data-oriana-assistant-open='true']"))
    .some((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0;
    });
}
