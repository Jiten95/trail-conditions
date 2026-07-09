# AGENTS.md

Instructions for any AI coding agent (Cursor, Codex, etc.) working in this repo.
(Named `AGENTS.md`, not `agent.md` — that's the filename these tools actually
look for automatically.)

## What this is

Trail Conditions — a hazard-reconciliation engine for hikers, built around
the Schynige Platte → First day hike in the Bernese Oberland, Switzerland
(this replaced Mont Blanc's Gouter Route: the Swiss trail is fully routable
so the map draws the real path, and it sits in an official SLF avalanche
region). One route, three kinds of signal (live weather, crowd-submitted
reports, ranger/trail-office advisories) combined into a single, explainable
status per waypoint with a visible confidence score and a one-line "why."
See `README.md` for the full pitch, the live-vs-seeded data source table, and
out-of-scope items — don't duplicate that here, read it there.

## Stack

- Vite + React 18 + TypeScript (`strict: true`), no backend — fully
  client-side SPA. All "live" data comes from public APIs called directly
  from the browser.
- `react-leaflet` + OpenStreetMap tiles for the map.
- Vitest for unit tests (reconciliation engine + avalanche heuristic only —
  no UI tests yet).
- No state management library: React context + `useState`/`useMemo`.

## Architecture map

- `src/lib/reconcile.ts` — **the core IP.** Pure functions: decay tiers,
  per-source confidence weights, cross-source conflict detection, combined
  status. Fully unit tested in `reconcile.test.ts`. Read this before
  touching anything status/verdict-related — it's intentionally kept free
  of fetching/UI code so it stays auditable.
- `src/lib/weather.ts` — live Open-Meteo fetch, elevation-corrected per
 waypoint (mountain terrain needs a real elevation or temperature reads
 wrong by several degrees). Also pulls today's sunrise/sunset + daylight
 duration.
- `src/lib/daylight.ts` — pure, timezone-safe helpers that turn the
 Open-Meteo sun times into a "daylight left" readout. Unit-tested.
- `src/lib/avalancheRisk.ts` — the weather-derived heuristic (low/moderate/
 high). **Not** an official bulletin — the UI only shows it when no live SLF
 bulletin is available; keep it labeled as an estimate.
- `src/lib/slfAvalanche.ts` — the **live** official avalanche source: fetches
 SLF's public EAWS GeoJSON and matches a waypoint to a danger rating by
 point-in-polygon. Seasonal (empty in summer) → returns null and the UI
 falls back to the heuristic. Pure parsing is unit-tested against mock
 winter data; the network path degrades gracefully.
- `src/lib/routeGeometry.ts` — routes real trail geometry with BRouter's
 hiking profile per leg between named waypoints, with a straight-line
 fallback per leg (and validation that rejects implausible detours). Cached
 in `localStorage`. **Verified rendering** — the Swiss trail draws as a real
 winding path, not straight lines.
- `src/data/route.ts` — two routes as `Route` objects in `ROUTES` (each with
 its own 7 waypoints and per-route waypoint ids: `sp-*` for the default
 Schynige Platte → First, `mb-*` for the backup Gouter Route). The header's
 route picker switches the active route; `DEFAULT_ROUTE_ID` is the first
 entry. Seed reports/advisories are keyed to these per-route ids so each
 route shows its own hazards. Keep it to these two curated routes — don't
 add a route-authoring/import system without being asked.
- `src/data/seedReports.ts` / `seedAdvisories.ts` — seeded/mock crowd +
  ranger data with staggered timestamps so every decay tier is visible on
  load.
- `src/state/reportsStore.tsx` — React context for crowd reports (seeded +
  user-submitted, persisted to `localStorage`, no backend).
- `src/components/` — `MapView` (Leaflet), `WaypointDetail` (Conditions /
  Submit report tabs, 4-column metrics row, collapsible source breakdown),
  `BottomSheet` (drag-to-dismiss only — **no close button, by explicit user
  request**, don't add one back), `ReportForm`, `icons.tsx` (hand-rolled
  inline SVGs, no icon library dependency).
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
  new data source, check `README.md`'s live-vs-seeded table and update it
  honestly — judges/reviewers are explicitly told to check this.
- Status colors (green/amber/red/grey) are semantically fixed in
  `src/lib/statusMeta.ts` — never repurpose them for something unrelated.

## Known issues / unverified

- The build has now been run in a real Node environment: `npm install`,
 `npm test` (36 tests pass), `tsc`/`npm run build`, and `npm run dev` all
 succeed. The trail path was also confirmed rendering in a headless browser.
- BRouter's public instance can be slow or rate-limited. There's a 9s
 per-leg timeout and a `localStorage` cache after first success, but expect
 possible slowness on a first load / fresh incognito session. A route with
 an implausible detour is rejected and falls back to a straight leg.
- SLF avalanche is seasonal: in summer the bulletin is empty, so the
 avalanche card shows the labeled heuristic. The official-bulletin parsing
 is unit-tested against mock winter data but the *live* winter path can't be
 exercised out of season — it's written defensively (any parse failure
 degrades to the heuristic).

## Pending work (not started yet)

The real trail path is now confirmed, which unblocks all three of these:

- 1km-spaced checkpoints along the real trail (spacing depends on true
 routed distance, now available from `routeGeometry.ts`).
- Tap-anywhere-on-the-route hazard reporting, with marker clustering so the
 map doesn't get crowded with report pins.
- Tap-to-inspect on the interpolated status between checkpoints (today only
 the 7 named waypoints are inspectable; the line between them isn't
 interactive).

## Running it

```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest — reconciliation engine + avalanche heuristic
```

## Deployment

Deployed on Vercel via GitHub integration (`Jiten95/trail-conditions`,
branch `main`, auto-deploys on push). Static Vite build, no environment
variables needed.
