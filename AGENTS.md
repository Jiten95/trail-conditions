# AGENTS.md

Instructions for any AI coding agent (Cursor, Codex, etc.) working in this repo.
(Named `AGENTS.md`, not `agent.md` — that's the filename these tools actually
look for automatically.)

## What this is

Trail Conditions — a hazard-reconciliation engine for hikers, built around
the Schynige Platte → First "Faulhornweg" ridge hike in the Bernese Oberland,
Switzerland. One route, several kinds of signal (live weather, the official
SLF avalanche bulletin, crowd-submitted reports, ranger/guide advisories)
combined into a single, explainable status per waypoint with a visible
confidence score and a one-line "why." The route is Swiss on purpose: SLF's
avalanche bulletin is a key-less, CORS-open API, so we can show a real
official danger level (France's Mont-Blanc BERA can't be used client-side).
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
  wrong by several degrees).
- `src/lib/avalancheBulletin.ts` — the **official** avalanche source. Fetches
 SLF's Swiss bulletin (CAAMLv6 JSON, key-less, CORS-open) and maps each
 waypoint's `slfRegionId` to an EAWS danger level (1–5). Seasonal — returns
 nothing ~Jun–Oct. `parseSlfBulletins` is pure and unit-tested.
- `src/lib/avalancheRisk.ts` — the **fallback** heuristic from live weather
 data, used only when there's no live SLF bulletin. **Not** an official
 avalanche bulletin — keep it labeled as such (the UI shows "SLF official"
 vs. "Heuristic — no live bulletin") anywhere it surfaces.
- `src/lib/routeGeometry.ts` — fetches/stitches real trail geometry from OSM
  Overpass per leg between named waypoints, with a straight-line fallback
  per leg if the live data doesn't stitch cleanly. **Unverified visually as
  of this handover** — see Known Issues.
- `src/data/route.ts` — the 6 named waypoints for the one hardcoded route
 (Schynige Platte → First), each carrying an `slfRegionId` for the official
 avalanche lookup. `ROUTES` is a stub array for a future route picker, not a
 real multi-route system yet — don't build more route-switching machinery
 than the UI currently exposes without being asked.
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

- **No Node.js/npm was available in the environment this was built in.**
  Everything was written and hand-reviewed without ever running
  `npm install`, the dev server, or the test suite. If you have a working
  Node environment, run `npm install && npm test && npm run dev` first and
  fix whatever that surfaces before trusting anything else below.
- `src/lib/routeGeometry.ts` (the real OSM trail path) hasn't been visually
  confirmed in a browser. It has defensive fallbacks so it shouldn't ever
  render worse than a straight line, but whether the stitched path is
  genuinely accurate per leg needs an actual look at the map.
- The public Overpass API instance can be slow or rate-limited. There's a
  9s per-leg timeout and a `localStorage` cache after first success, but
  expect possible slowness on a first load / fresh incognito session.

## Pending work (not started yet)

- 1km-spaced checkpoints along the real trail — blocked on confirming the
  real path (above) first, since checkpoint spacing depends on true
  distance.
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
