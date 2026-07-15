# Repository Hygiene Inventory

## Baseline: 2026-07-15

The local working directory can contain roughly 40,000 files without the Git
repository containing 40,000 tracked files.

| Area | Tracked files | Classification | Cleanup rule |
| --- | ---: | --- | --- |
| `src/` | 276 | application source | refactor only by feature boundary |
| `supabase/` | 47 | schema and migrations | append-only; never rename applied migrations |
| `public/` | 38 | runtime static assets | inventory size and references before relocation |
| `scripts/` | 12 | operational tooling | group by diagnostics/maintenance after use scan |
| `tests/` | 7 | regression coverage | keep close to protected behavior |
| repository root | 60+ | configuration, reports, ad-hoc tools | classify before relocating or archiving |

The large local file count is primarily generated state:

- `node_modules/`: 29,342 files
- `.next/`: 6,899 files
- `.git/`: 3,388 files

These paths are ignored and must not be committed, deleted as a source-code
cleanup action, or used as a measure of application complexity.

## Root Candidates

| Candidate class | Current examples | Intended destination | Precondition |
| --- | --- | --- | --- |
| Canonical engineering documentation | architecture, authorization, threat, data-flow docs | `docs/architecture/` | preserve internal links |
| One-time reports | audit, QA, stabilization, image-loading reports | `docs/reports/YYYY-MM/` | add report index and no active imports |
| Operational runbooks | R2, release, deployment instructions | `docs/operations/` | replace stale environment guidance |
| Diagnostic utilities | debug, dump, table/query scripts | `scripts/diagnostics/` | no package script/import references |
| Maintenance utilities | migration, translation, asset helpers | `scripts/maintenance/` | document inputs and side effects |
| Generated/manual artifacts | `album.zip`, database dump | external archive or ignored local artifact | prove not used by runtime/deploy |

## Non-Negotiable Rules

- Every move is a dedicated commit with no content change.
- Every deletion first has a `git grep`/runtime/import check and a documented
  archive or regeneration path.
- No Git history rewrite, force-push, Supabase mutation, R2 mutation, or Vercel
  deployment is part of repository hygiene work.
- Applied Supabase migrations stay at their exact paths and filenames.
- Production assets stay in place until a separately approved asset migration
  has a dry-run, copy verification, and rollback rehearsal.
