# AGENTS.md

Rules for Codex working in this Next.js + Supabase album app.

## Work Style

- Understand the relevant code path before editing.
- Make small, correct, reversible changes.
- Fix root causes, not symptoms.
- Do not broad-rewrite unless the task requires it.
- Do not add unrelated features or remove existing features unless asked.
- Do not hide errors with broad `try/catch`, `any`, ignored promises, disabled lint rules, or build/lint bypasses.

## Reading The Codebase

- Start with targeted search, not manual full-repo scans.
- Use `git status`, `git ls-files`, `rg`, and file names to locate relevant code.
- Ignore `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.vercel`, logs, cache, generated files, and large media unless directly relevant.
- Read only files connected to the current task.
- For large tasks, write a short plan before editing.

## Required Workflow

Before editing:

- Run `git status`.
- Identify the relevant files.
- State the suspected root cause briefly.

During editing:

- Keep changes minimal.
- Reuse existing helpers, patterns, schemas, and UI conventions.
- Preserve security and privacy boundaries.
- Update types, schema/migrations, API, and UI together when the behavior crosses layers.

After editing:

- Run `npm run lint`.
- Run `npm run build`.
- Manually test the affected user flow when possible.
- Report files changed, reason, test results, and remaining risks.

## Security

- Never edit `.env` files.
- Never expose secrets, service role keys, R2 keys, signed URLs, access tokens, refresh tokens, session IDs, or raw private headers.
- Do not move server-side authorization to the client.
- User-specific, private, and admin data must not be publicly cached.
- Private album access must be checked server-side for album detail, media viewer, ZIP download, and single download.
- Notifications, messages, grants, and revokes must use RLS and/or server-side guards.
- Validate all user input server-side.
- Avoid open redirects. `next` and `target_url` values must be same-site relative paths only.

## Performance

- Do not load all rows when pagination or filtering is needed.
- Use aggregate/count queries for dashboard metrics.
- Avoid N+1 Supabase queries.
- Header/avatar fetch unread notification count only, not full notification lists.
- Notification panel fetches only the latest page.
- Album grids use thumbnail/medium assets, not originals.
- Viewer loads full media only when needed.
- Avoid heavy polling and state updates on every scroll/mousemove.
- Prefer `transform` and `opacity` for animation.

## Project Invariants

- Preserve albums, private access, grants/revokes, requests, notifications, threaded messages, uploads, downloads, ZIP export, comments, likes, Studio settings, i18n, theme, and security behavior.
- Public admin replies display as `Oriana Wren`; never expose admin/founder identity to public users.
- Granted private albums show accessible thumbnails; ungranted private albums remain locked.
- Access revoke must immediately remove real access, not only update UI badges.
- Google login must preserve the intended return path.

## Commit Rules

- Do not commit if `npm run build` fails because of the change.
- Do not push without reporting lint and build results.
- Use specific commit messages, for example: `fix(auth): preserve album return path after login`.
