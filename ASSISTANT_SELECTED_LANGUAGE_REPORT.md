# Oriana Companion Selected Language Report

## Language Source

- The existing site language selector is `LanguageSwitcher`.
- It stores the selected language in `localStorage` key `album-locale`.
- It also writes the cookie `NEXT_LOCALE`.
- Current site locale codes are `en`, `vi`, `zh`, `ja`, `ko`, `th`, `id`, `fr`, `de`, and `es`.
- The assistant now reads the same source; it does not add a second language selector.

## Locale Mapping

- Default locale is English: `en`.
- Site `zh` maps to assistant `zh-CN`.
- Existing site codes map directly for `en`, `vi`, `ja`, `ko`, `th`, `id`, `fr`, `de`, and `es`.
- Alias handling covers common variants such as `zh-Hans`, `ja-JP`, `ko-KR`, `th-TH`, `id-ID`, `fr-FR`, `de-DE`, and `es-MX`.
- Invalid, empty, or missing locale values safely fall back to `en`.

## Supported Assistant Locales

- `en`
- `vi`
- `zh-CN`
- `ja`
- `ko`
- `th`
- `id`
- `fr`
- `de`
- `es`

## Fallback Behavior

- The assistant first uses the selected site language.
- If no explicit site language is available, it checks the `NEXT_LOCALE` cookie.
- Browser language is used only after explicit site language sources are missing.
- If a locale, answer, or UI string is missing, English is used.
- Unknown questions return a safe Contact handoff and do not invent site policy.

## Knowledge Packs

- `assistantKnowledge` now includes entries for all supported assistant locales.
- English and Vietnamese have fuller localized policy text and synonyms.
- Chinese, Japanese, Korean, Thai, Indonesian, French, German, and Spanish use compact localized answers for the critical topics and English-derived safe policy coverage for the rest.
- Core intents remain unchanged:
  - private access
  - selected private albums
  - all private albums
  - manual/auto approval
  - phone policy
  - login
  - request status
  - album status
  - ZIP/download
  - contact/messages
  - notifications
  - blocked account
  - troubleshooting
  - unknown fallback

## UI Strings

- Added assistant UI copy for all supported locales.
- Localized strings include title, greeting, quick action labels, input placeholder, close/send labels, handoff copy, privacy note, unknown fallback, and auth-required copy.
- `AssistantPanel`, `AssistantSearchBox`, `AssistantMessageList`, and the floating runtime now read the selected assistant locale.

## Security Safeguards

- No user input is rendered as HTML.
- No `dangerouslySetInnerHTML` was added.
- No external translation API, LLM, realtime service, or polling was added.
- Translation packs contain no secrets, tokens, phone numbers, private URLs, signed URLs, R2 keys, or admin identity.
- Contact and login links remain same-site relative paths.

## Performance Safeguards

- Locale data is static and small.
- No heavy NLP package was added.
- No extra network calls were added.
- Existing panel lazy-loading and mascot image loading remain unchanged.
- Intent matching still uses simple normalized keyword checks.

## Verification

- `npm run lint`: passed with 0 errors. Existing unrelated warnings remain.
- `npm run build`: passed.
- TypeScript completed successfully during the production build.

## Remaining Translation Notes

- Non-English packs are intentionally concise.
- English remains the authoritative fallback for any missing or uncertain answer.
- Future polish can improve natural wording per language without changing the locale architecture.
