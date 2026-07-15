# Oriana Companion UI Runtime Fix Report

## Root Cause

- `Ask Oriana Companion` rendered `AssistantPanel` directly inside `UserMenu`.
- The panel therefore lived under the header/dropdown subtree instead of a top-level overlay root.
- Its old sizing depended on `h-full` inside an absolutely positioned sheet, which could collapse into a thin clipped bar.
- The saved mascot/mode had no global runtime on public pages, so helpful/expressive preferences were saved but had no visible dock outside Profile/UserMenu.

## Files Changed

- `src/app/layout.tsx`: mounts `OrianaCompanionRuntime` once from the root app shell.
- `src/components/UserMenu.tsx`: removes embedded panel rendering and dispatches a global open event.
- `src/components/assistant/AssistantPanel.tsx`: renders through a portal with fixed overlay sizing, focus handling, and Escape close.
- `src/components/assistant/OrianaCompanionRuntime.tsx`: adds the lightweight public runtime, mode-aware dock, and shared panel state.
- `src/components/media/MediaViewer.tsx`: marks when the fullscreen media viewer is open so Companion does not cover it.
- `src/lib/assistant/runtime-events.ts`: centralizes runtime event names and route filtering.

## Panel Layout Fix

- The panel now portals to `document.body`.
- Desktop panel uses `width: min(420px, calc(100vw - 32px))` and `height: min(720px, calc(100dvh - 32px))`.
- Mobile renders as a bottom sheet with `max-height: min(88dvh, 720px)`.
- Panel content scrolls internally with `min-h-0 flex-1 overflow-y-auto`.
- Overlay is fixed at app level and no longer depends on the avatar dropdown.

## Runtime Behavior

- `off`: no menu action, dock, launcher, or panel.
- `quiet`: avatar dropdown entry only.
- `helpful`: subtle floating launcher on allowed public pages.
- `expressive`: subtle floating dock with the selected mascot.
- Studio, login, auth callback, and boycott routes are excluded.
- Media viewer open state hides the runtime so it does not cover fullscreen album viewing.

## Mascot Visibility

- The panel header passes `preferences.character` directly to `AssistantPet`.
- Expressive dock also renders `preferences.character`.
- Mascots remain SVG files loaded by `img src`; no mascot bundle inflation was added.
- `AssistantPet` still falls back to the default mascot if an image fails.

## Accessibility

- Panel has `role="dialog"` and `aria-modal="true"`.
- Close button has an accessible label.
- Escape closes the panel.
- Focus moves into the panel on open and returns to the previous element on close.

## Performance Safeguards

- Panel remains dynamically imported.
- No LLM, realtime, polling, or mouse/scroll tracking was added.
- Notification count is fetched only when the panel opens and only for signed-in users.
- Dock dismissal is session-local React state, not repeated storage writes.
- Media viewer state uses `useSyncExternalStore` and one lightweight DOM flag.

## Test Results

- `npm run lint`: passed with 0 errors. Existing warnings remain in unrelated files: custom font warning, several existing `<img>` warnings, one existing `SecurityConsole` dependency warning, and unused variables in `src/lib/albums.ts`.
- `npm run build`: passed.
- `npm run dev`: started successfully at `http://localhost:3000`.
- Mascot asset check: `http://127.0.0.1:3000/assistant/mascots/capybara.svg` returned HTTP 200.
- Browser console check: no red console errors were observed during the local page inspection.

## Remaining Notes

- The in-app browser automation surface did not reliably dispatch click/keyboard events into the React page during this run, so interactive click verification was limited. The code path was still verified by lint, production build, route/component inspection, and asset checks.
- No environment files, private access logic, uploads, downloads, grants, revokes, ZIP export, or Supabase policies were changed.
