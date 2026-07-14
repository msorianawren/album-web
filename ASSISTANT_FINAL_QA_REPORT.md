# Oriana Companion Final QA Report

## Phase 1-3 Summary

- Phase 1 added the mascot foundation: capybara, fox, owl SVG assets, mascot registry, reusable `AssistantPet`, and Studio preview.
- Phase 2 added user preferences for character, mode, motion, sound, loading pet, and context hints.
- Phase 3 added a rule-based assistant panel with static FAQ knowledge, intent matching, quick actions, and explicit Contact handoff.

## Characters Available

- Capybara: calm guide.
- Fox: clever helper.
- Owl: quiet advisor.

## Assistant Capabilities

- Answers common website questions about private access, login, request status, album states, ZIP downloads, contact, notifications, phone policy, blocked accounts, and troubleshooting.
- Supports English and Vietnamese keyword matching.
- Offers Contact handoff when the answer is unknown.
- Reads unread notification count only when the panel is open and the user is authenticated.

## Assistant Limitations

- No LLM, no external AI API, no realtime, and no model download.
- Does not approve access, grant access, revoke access, block users, upload media, download private media, or send Contact messages automatically.
- Does not store full chat history.

## Warning Count

- Before hardening: 61 warnings, 0 errors.
- After hardening: 14 warnings, 0 errors.
- Assistant-introduced warnings: 0 remaining.

## Warnings Fixed

- Removed safe unused imports and unused variables across public pages, contact components, Studio components, UI preference hooks, and i18n helpers.
- Removed unused migration-script variables while preserving the migration notice behavior.
- Documented the intentional plain `<img>` use in `AssistantPet`, because mascot SVG files must load from `/public` instead of being bundled into JS.

## Warnings Left

- `src/app/layout.tsx`: Next font warning. Left because moving fonts into a different loading pattern can affect global branding.
- Dynamic `<img>` warnings in landing/studio components. Left because several URLs are user-configured or remote media previews; switching to `next/image` may require domain/config work and could break previews.
- `src/components/studio/SecurityConsole.tsx`: omitted `search` dependency is intentional so search runs only when the admin presses search/enter.
- `src/lib/albums.ts`: unused revoke-related variables are in private-access logic. Left to avoid changing sensitive access behavior during QA hardening.

## Security Checks

- No OpenAI, Anthropic, Gemini, Ollama, or external AI API usage.
- No `dangerouslySetInnerHTML` or raw HTML rendering in assistant components.
- SVG mascot scan found no script tags, event handlers, `foreignObject`, base64 payloads, or external hrefs.
- Contact handoff requires explicit confirmation and creates only a temporary session draft.
- Assistant local storage contains only small UI metadata and preferences.
- Guest `/api/notifications?mode=count` remains `401`.
- User-specific notification count uses the existing authenticated, no-store endpoint.

## Performance Checks

- Assistant panel is dynamically imported from the avatar menu.
- No assistant fetch happens on initial page load.
- Notification count fetch happens only when the panel opens and a user is authenticated.
- No polling, realtime, model download, or heavy animation library.
- Mascots are served as public SVG assets via image URLs.
- Reduced motion remains respected by `assistant-pet.css`.

## UX Checks

- Assistant does not auto-open.
- Assistant entry point is hidden when mode is `off`.
- Panel is a calm mobile bottom sheet / desktop side panel.
- Quick actions are available for common support tasks.
- Unknown fallback is explicit and does not invent an answer.
- Profile & Rules clarifies that the helper is rule-based, not human, and cannot approve access.

## Smoke Test Results

- `/`: 200.
- `/albums`: 200.
- Public album `/albums/beneath-clear-daylight-moments-turn-wonderful`: 200.
- Private album locked route `/albums/officer`: 200.
- `/about`: 200.
- `/contact`: 200.
- `/profile`: 200.
- `/login`: 200.
- Mascot SVGs: capybara, fox, owl all 200.
- `làm sao xin quyền album private?`: `private_access_help`, high confidence.
- `tải zip thế nào?`: `download_zip_help`, high confidence.
- Out-of-scope question: `unknown`, low confidence, Contact handoff offered.
- Guest notification count: 401.

## Final Validation

- `npm run lint`: pass, 0 errors, 14 warnings.
- `npm run build`: pass.
- `npm run typecheck`: not available in `package.json`.
- `npm test`: not available in `package.json`.

## Remaining Risks

- Browser-level visual testing was not automated because Playwright is not installed in the current workspace.
- Logged-in assistant notification count was not verified with a live authenticated browser session during this pass.
- Remaining warning cleanup should be handled in a dedicated refactor pass, especially image optimization and private-access dead-code analysis.

## Next Recommended Phase

- Add focused Playwright smoke tests for avatar menu, assistant panel, preference persistence, and Contact handoff.
- Add a dedicated image optimization pass for dynamic remote media previews.
- Review private-access revoke variables in `src/lib/albums.ts` with test coverage before removing them.
