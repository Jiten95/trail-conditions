# Alpine Conditions

A **terrain-aware alpine conditions engine**. Tap any point — a named waypoint
on a sample objective, or anywhere on the map — and it assembles the physical
facts a mountaineer actually reasons about: live weather and wind, the official
avalanche danger, and deterministic **terrain facts** computed on the spot
(slope angle, aspect, whether that slope is in sun or shade through the day,
recent freeze-thaw, and where the wind is loading snow).

Every fact is tagged with **where it came from** (its provenance) and how fresh
it is. The app deliberately **does not** blend these into a single "safe / not
safe" verdict or a confidence percentage — it presents the evidence and leaves
the decision to you. See "The line we don't cross" below.

## Why this shape (and not "conditions on a trail")

A conditions feed for catalogued trails is a solved, crowded problem, and it
only works where there's a curated trail and a crowd. The interesting, less
served problem is **arbitrary, off-trail alpine terrain with no crowd**: a
couloir, a ski line, a scramble, a point you drop on a ridge. There's no
community content to aggregate there, so the base layer has to be a
**model**: terrain (from a DEM) + weather (from a forecast model) + astronomy
(sun geometry), all computable for any point on earth. Human observations
(crowd/ranger) are kept, but demoted to a **sparse correction layer** shown
alongside the model, never the foundation.

## The line we don't cross

Alpine hazard calls are life-and-death, so we draw a hard line:

- We surface **Tier B** facts: deterministic terrain/astronomy and live weather,
  each individually true and auditable.
- We never emit **Tier C** judgements: no "safe to cross," no "the verglas will
  be gone by 10:00," no blended go/no-go. Those can't be validated with the data
  available and are exactly where overconfidence gets people killed.

This is how real avalanche tools work — they hand you danger factors, you make
the call.

## Sample objectives

- **Schynige Platte → First (Bernese Oberland, Switzerland)** — a classic
  high-alpine day hike (7 waypoints) whose trails render as a real path and
  which sits in an official avalanche-bulletin region (SLF).
- **Gouter Route (Voie Normale), Mont Blanc, France** — a stress test: upper
  glaciated legs aren't routable (straight-line fallback) and it's outside the
  SLF region (avalanche always falls back to the heuristic there).

The named waypoints are just starting points. **Tap anywhere on the map** to
drop a pin and inspect that arbitrary point — this is the actual product, and
it works with zero crowd data because the base layer is computed, not
aggregated.

## Provenance, not a confidence score — please read this before judging

There is intentionally no single "confidence %". Instead every signal is
labeled with one of four provenances, so nothing is a black box:

| Provenance | Meaning | Sources here |
|---|---|---|
| **official** | A real published authority feed | [SLF](https://www.slf.ch/en/avalanche-bulletin-and-snow-situation/) avalanche bulletin (in season, matched by point-in-polygon) |
| **modeled** | Numerical weather-model output, or a fact derived from it | [Open-Meteo](https://open-meteo.com/) temperature/precip/wind/snow; freeze-thaw history; wind-loading geometry; the avalanche *heuristic* fallback; daylight |
| **computed** | Deterministic math on terrain (DEM) or astronomy | Slope angle & aspect (Open-Meteo elevation grid, Horn's method); sun-on-slope (solar position) |
| **reported** | A human observation | Seeded crowd reports + ranger advisories (illustrative; the report form adds real local ones) |

Notes on honesty:

- Open-Meteo "current" values are **model output**, not station measurements —
  so they're labeled `modeled`, not "measured."
- Terrain slope/aspect come from a **3x3 elevation grid** sampled around the
  point via Open-Meteo's keyless elevation API and reduced with Horn's method;
  it degrades to "terrain unavailable" (weather still shows) if the source is
  unreachable — same graceful-degradation pattern as everything else.
- The avalanche card is the **official SLF bulletin** when one covers the point
  in season, otherwise a transparent **heuristic** from live weather, always
  labeled which.
- Crowd/ranger data is **seeded and illustrative** — there is no shared backend.
  The in-app form adds real reports to `localStorage` (local to your browser).

## The engine (the core logic)

`src/lib/conditions.ts` — `assembleConditions(...)` — is pure/stateless and unit
tested (`conditions.test.ts`). It takes weather + terrain + sun + freeze-thaw +
wind-loading + avalanche + observations and returns a `PointConditions`: a list
of provenance-tagged `Signal`s plus a factual `conditionsSeverity` used only to
color the map marker. `conditionsSeverity` describes the current weather /
avalanche state (calm / elevated / severe) — it is **not** a safety verdict.

The deterministic pieces are their own pure, tested libraries:

- `src/lib/terrain.ts` — slope + aspect from an elevation grid (Horn's method).
- `src/lib/sun.ts` — solar position + sun-on-slope timeline for the day.
- `src/lib/derivations.ts` — freeze-thaw history and wind-loading geometry.

Reported observations age out of relevance (fresh < 6h, recent 6-24h, aging
24-72h, dropped past 72h); they're shown as independent signals, never merged
into the model.

## Screens

1. **Map** (`src/components/MapView.tsx`) — sample-objective waypoints plus a
   drop-anywhere pin; marker color + symbol (never color alone) show the factual
   conditions severity.
2. **Point detail** (`src/components/WaypointDetail.tsx`) — the conditions
   severity (clearly labeled "not a verdict"), a sun-on-slope timeline with a
   "project sun to +2/4/6h" control, then every signal with its provenance
   badge, value, a neutral "what this means," and freshness. Swipe/tab to the
   "Add observation" form.

## Running it

```bash
npm install
npm run dev      # starts the Vite dev server
npm test         # runs the engine + terrain/sun/derivation unit tests
```

## Out of scope (roadmap)

- GPX import / draw-a-line objectives, marker clustering.
- Any predictive (Tier C) hazard call.
- Offline / dead-zone capture, authentication, a shared crowd backend.
- Calibrating the model against ground truth at scale (the honest cold-start
  gap: with little crowd data, "verified" coverage is thin).
