# Baseline Metrics

## Bundle Sizes (pre-refactor)
- three: TBD
- @react-three/fiber: TBD
- gsap: TBD
- framer-motion: TBD
- jszip: TBD
- exifr: TBD
- sharp: TBD
- AWS SDK: TBD
- AssistantPanel: TBD
- MediaViewer: TBD

## Lighthouse Scores
| Route | Mobile Score | Desktop Score |
|---|---|---|
## Lighthouse Scores (Mobile - Headless)
| Route | Score |
|---|---|
| `/` | 32 (Perf), 98 (Access), 75 (BP), 100 (SEO) |
| `/albums` | Pending |
| `/albums/where-morning-lingers` | Pending |
| `/games` | Pending |
| `/about` | Pending |
| `/contact` | Pending |

## Phase 4-8 Local Check (Desktop, unseeded local data)

This is a local smoke measurement, not production field data. The collection
timed out before all configured runs completed, but the completed reports were:

| Route | Performance | LCP | CLS |
|---|---:|---:|---:|
| `/` | 60-64 | 2.02-2.21s | 0.032-0.036 |
| `/albums` | 89 | 1.32s | 0.022 |

INP requires real interactions or field data and was not reported by this
headless run. The CI configuration retains the LCP and CLS thresholds; collect
production RUM through Vercel Speed Insights before treating the target as met.

## Vercel Speed Insights (P75)
*Note: Please check Vercel Dashboard for exact production field data prior to merging Phase 1.*
- LCP: [Check Vercel]
- INP: [Check Vercel]
- CLS: [Check Vercel]
