# AGENTS.md

Instructions for any AI coding agent (Cursor, Codex, etc.) working in this repo.
(Named `AGENTS.md`, not `agent.md` — that's the filename these tools actually
look for automatically.)

## What this is

Alpine Conditions — a terrain-aware alpine conditions engine. Tap any point
(a named waypoint on a sample objective, or anywhere on the map) and it
assembles the physical facts a mountaineer reasons about: live weather/wind,
official/heuristic avalanche danger, and deterministic terrain facts (slope,
aspect, sun-on-slope through the day, freeze-thaw, wind loading). Every fact
is tagged with its **provenance** (official / modeled / computed / reported)
and freshness. There is **no blended confidence score and no go/no-go
verdict** — the app presents evidence and the user decides.

Two sample objectives ship (Schynige Platte → First in the Bernese Oberland,
and the Gouter Route on Mont Blanc), but the actual product is tap-anywhere:
drop a pin on arbitrary off-trail terrain and it still works, because the base
layer is *computed* (terrain + weather + astronomy), not aggregated from a
crowd. See `README.md` for the full pitch, the provenance table, and the "line
we don't cross" (Tier B facts only, never Tier C predictions like "safe to
cross") — don't duplicate that here, read it there.

## Stack

- Vite + React 18 + TypeScript (`strict: true`), no backend — fully
  client-side SPA. All "live" data comes from public APIs called directly
  from the browser.
- `react-leaflet` + OpenStreetMap tiles for the map.
- Vitest for unit tests (the conditions engine + terrain/sun/derivations +
  avalanche heuristic + SLF parsing + daylight). No UI tests yet.
- No state management library: React context + `useState`/`useMemo`.

## Architecture map

- `src/lib/conditions.ts` — **the core logic** (replaced the old
  `reconcile.ts`). Pure `assembleConditions(...)` takes weather + terrain +
  sun + freeze-thaw + wind-loading + avalanche + observations and returns a
  `PointConditions`: a list of provenance-tagged `Signal`s plus a factual
  `conditionsSeverity` (marker color only, NOT a verdict). No confidence
  score, no go/no-go, no cross-source conflict resolution — it assembles
  independent facts, it does not adjudicate them. Unit tested in
  `conditions.test.ts`; kept free of fetching/UI so it stays auditable.
- `src/lib/terrain.ts` — **computed** slope + aspect from a 3x3 elevation grid
  (Horn's method), sampled via Open-Meteo's keyless elevation API. Pure math
  is unit-tested; `fetchTerrain` degrades to null (weather still shows).
- `src/lib/sun.ts` — **computed** solar position (pure astronomy) + a
  sun-on-slope timeline for the day (is this slope lit now / when does it
  catch sun). Unit-tested, no network.
- `src/lib/derivations.ts` — **modeled-derived** Tier-B facts: freeze-thaw
  history from hourly temps, and wind-loading geometry (which lee slopes
  collect wind-transported snow). Pure, unit-tested.
- `src/lib/weather.ts` — live Open-Meteo fetch, elevation-corrected when known.
  `fetchWeather` (current, for markers) and `fetchPointWeather` (current +
  hourly series, for the detail view's freeze-thaw/sun). Now also carries wind
  direction + UTC offset.
- `src/lib/daylight.ts` — pure, timezone-safe "daylight left" helpers.
  Unit-tested.
- `src/lib/avalancheRisk.ts` — the weather-derived heuristic (low/moderate/
  high). **Not** an official bulletin — surfaced only when no live SLF
  bulletin covers the point; always labeled `modeled`/estimate.
- `src/lib/slfAvalanche.ts` — the **live official** avalanche source
  (`official` provenance): SLF public EAWS GeoJSON, point-in-polygon. Seasonal
  (empty in summer → null → heuristic fallback). Pure parsing unit-tested.
- `src/lib/routeGeometry.ts` — BRouter-routed trail geometry per leg for the
  sample objectives, straight-line fallback, `localStorage` cache.
- `src/lib/statusMeta.ts` — `SEVERITY_META`, keyed by `ConditionsSeverity`
  (calm/elevated/severe/unknown → green/amber/red/grey). Fixed status palette,
  paired with a symbol so hue is never the only cue.
- `src/data/route.ts` — two curated **sample objectives** as `Route` objects
  (`sp-*` / `mb-*` waypoint ids). Header picker switches the active one. Don't
  add a route-authoring/import system without being asked.
- `src/data/seedReports.ts` / `seedAdvisories.ts` — seeded/mock crowd + ranger
  observations (staggered timestamps). Illustrative only.
- `src/state/reportsStore.tsx` — React context for crowd reports (seeded +
  user-submitted, `localStorage`, no backend).
- `src/hooks/usePointRawData.ts` — fetches weather+hourly+terrain+avalanche for
  the one selected point; `usePointConditions.ts` computes the derivations and
  calls `assembleConditions` (recomputes cheaply on the sun time-shift control).
  `useWeather` / `useAvalanche` still fetch across the sample objective's
  waypoints for marker coloring.
- `src/components/` — `MapView` (Leaflet; sample waypoints + tap-anywhere
  dropped pin, colored by conditions severity), `WaypointDetail` (Conditions /
  Add observation tabs; severity badge with a "not a verdict" disclaimer, a
  sun-on-slope timeline with a "project sun +2/4/6h" control, then each signal
  with a provenance badge + neutral "what this means" + freshness),
  `BottomSheet` (drag-to-dismiss only — **no close button, by explicit user
  request**, don't add one back), `ReportForm`, `icons.tsx`.
- `src/App.tsx` — wires it all together.

## Conventions to follow

- No comments unless the WHY is genuinely non-obvious. Don't restate what
  the code already says.
- Don't add speculative abstraction for hypothetical needs — e.g. the route
  picker is a single-item stub on purpose; don't build out full multi-route
  support unless asked.
- Every live external call (Open-Meteo, Overpass) degrades gracefully
  instead of failing hard — preserve that pattern for any new integration.
- The whole premise of this project is "don't overclaim." Before adding any
  new data source, check `README.md`'s provenance table and update it
  honestly — judges/reviewers are explicitly told to check this.
- **The Tier B line is a hard rule.** Surface deterministic terrain/astronomy
  and live weather facts; never emit a Tier C prediction or a go/no-go verdict
  ("safe to cross", "verglas gone by 10:00", a blended safe/unsafe). Provenance
  labeling and the "not a verdict" disclaimer exist to hold this line — don't
  reintroduce a single blended confidence score or safety verdict.
- Status colors (green/amber/red/grey) are semantically fixed in
  `src/lib/statusMeta.ts` — they describe conditions severity, not safety, and
  are never repurposed for something unrelated.

## Known issues / unverified

- Runs in a real Node environment: `npm install`, `npm test`, `tsc`/`npm run
  build`, and `npm run dev` all succeed.
- Terrain (slope/aspect) uses Open-Meteo's elevation API sampled on a 90m 3x3
  grid; it degrades to null (terrain facts omitted) if unreachable. The Horn's
  method + solar-geometry math is unit-tested; the exact numeric accuracy of
  live slope/aspect for a given point hasn't been field-validated.
- Solar position is a standard approximation (good to ~a degree), fine for a
  sun/shade readout, not survey-grade.
- BRouter's public instance can be slow or rate-limited (9s per-leg timeout +
  `localStorage` cache). SLF avalanche is seasonal (summer → labeled heuristic
  fallback).

## Pending work (not started yet)

- GPX import / draw-a-line objectives (today: named waypoints + a single
  dropped pin).
- Multiple simultaneous dropped pins + marker clustering.
- Calibrating the model against ground truth (the cold-start gap).

## Running it

```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest — conditions engine + terrain/sun/derivations
```

## Deployment

Deployed on Vercel via GitHub integration (`Jiten95/trail-conditions`,
branch `main`, auto-deploys on push). Static Vite build, no environment
variables needed.
