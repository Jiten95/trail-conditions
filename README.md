# Trail Conditions

A hazard-reconciliation engine for hikers: one route, several different kinds
of signal (live weather, the official avalanche bulletin, crowd-submitted
reports, and a ranger/advisory feed), combined into a single, explainable
status per waypoint — with a visible confidence score and a one-line "why,"
never a black box.

Route used for the demo: **Schynige Platte → First (the "Faulhornweg"),
Bernese Oberland, Switzerland** — one of the classic Swiss ridge hikes above
Grindelwald/Interlaken (6 waypoints, from the Schynige Platte cog-railway
station over the Faulhorn to Grindelwald First). It's in Switzerland
deliberately: SLF publishes the Swiss avalanche bulletin as a key-less,
CORS-open API, so we can wire in a *real* official avalanche danger level
per waypoint — see below.

## What's live vs. seeded — please read this before judging

| Source | Status | Detail |
|---|---|---|
| **Weather** | **Live** | Every waypoint's lat/lng (and true elevation) is sent to the [Open-Meteo forecast API](https://api.open-meteo.com/v1/forecast) (no key required) for current temperature, precipitation, snowfall, and both sustained wind and gusts. The `elevation` parameter is set explicitly per waypoint so Open-Meteo lapse-rate-corrects temperature to the real altitude — without it, a high alpine point can read many degrees warmer than reality because the model's grid cell defaults to a coarser, lower average elevation. Refetched every 5 minutes. |
| **Avalanche danger** | **Live official bulletin (seasonal), with a heuristic fallback** | **Primary: the official [SLF](https://www.slf.ch) Swiss avalanche bulletin** (`src/lib/avalancheBulletin.ts`) — fetched from SLF's key-less, CORS-open CAAMLv6 JSON API (`aws.slf.ch/api/bulletin/caaml`, CC BY 4.0). Each waypoint is mapped to its SLF warning region (via the SLF sector API), and we show that region's official EAWS danger level (1–5). It is **seasonal**: SLF issues bulletins ~Nov–May, so out of season the endpoint returns an empty list. **Fallback: a heuristic** (`src/lib/avalancheRisk.ts`) — when there's no live bulletin, we compute a transparent, point-based low/moderate/high estimate from the *same* live Open-Meteo call (new-snow load, snow falling now, wind transport, rain-on-snow, thermal instability). The UI labels which one you're seeing: "SLF official" vs. "Heuristic — no live bulletin". The heuristic is **not** an official bulletin. (France's Mont-Blanc BERA, by contrast, can't be used here — it needs an authenticated Météo-France key and a server proxy — which is part of why the demo route is Swiss.) |
| **Crowd hazard reports** | **Seeded + live client-side** | Ships with 8 mock reports (`src/data/seedReports.ts`) with staggered timestamps so every decay tier is visible on load. The in-app report form adds *real* new reports to this pool immediately (persisted to `localStorage`), which is what makes the reconciliation engine live-updating — but there is no shared backend, so submissions are local to your browser, not a real multi-user crowd-sourcing system. |
| **Ranger / guide-office advisory** | **Seeded, illustrative only** | 4 mock advisories (`src/data/seedAdvisories.ts`) simulating a bulletin from a body like the SAC (Swiss Alpine Club) hut wardens or the Grindelwald mountain guides. This is **not** a real integration with any guide service — it exists to demonstrate a higher-trust source type in the reconciliation math. |

We're calling this out explicitly because overclaiming a live integration we
don't have would be worse than being upfront about scope.

## The reconciliation engine (the core IP)

All logic lives in `src/lib/reconcile.ts`, is pure/stateless, and has unit
tests in `src/lib/reconcile.test.ts`. No UI or fetching code is required to
understand or verify it.

**Decay.** Crowd and ranger reports lose confidence weight with age:

| Age | Weight |
|---|---|
| < 6h | full (1.0×) |
| 6-24h | half (0.5×) |
| 24-72h | low (0.2×) |
| > 72h | expired — excluded from the score entirely |

Live weather never decays — it's re-fetched on every load, so it's always
"now."

**Confidence weights.** Each source type has a base trust weight before decay
is applied: weather `1.0`, ranger advisory `0.9`, crowd report `0.6`. A
waypoint's total confidence is (very roughly) *how much fresh, corroborating
weight is behind the verdict*, scaled against "all three sources present,
fresh, and agreeing" as the ceiling.

**Cross-source disagreement.** Not every crowd/ranger report is comparable to
weather — a rockfall or wildlife sighting has nothing to do with rain or wind,
so it's treated as an independent hazard signal. Only *weather-correlated*
report types (`flooding`, `ice`, `high-wind`, `lightning`) are checked against
the live weather reading for agreement. If weather reads clear but a fresh
weather-correlated report flags a hazard (or vice versa), the engine does
**not** silently pick one side — it returns `status: "unconfirmed"`, caps
confidence, and the "why" states both readings explicitly ("conflicting
signals").

**Combined status.** When sources aren't in conflict, hazard levels (0-3,
derived from severity for reports and from precipitation/wind/temperature
thresholds for weather) are combined into a confidence-weighted average and
mapped to `clear` / `caution` / `hazard`. Every waypoint's detail view shows
each individual source's raw reading, its weight × decay, and the resulting
effective weight — so the verdict is auditable, not asserted.

## Screens

1. **Map view** (`src/components/MapView.tsx`) — the route as a polyline over
   6 waypoints; marker color + symbol (never color alone) show reconciled
   status.
2. **Waypoint detail** (`src/components/WaypointDetail.tsx`) — every source's
   current reading, its confidence weight and decay, the reconciled verdict,
   and the one-line why.
3. **Report submission** (`src/components/ReportForm.tsx`) — add a hazard
   report to the selected waypoint; it's reconciled immediately.

## Running it

```bash
npm install
npm run dev      # starts the Vite dev server
npm test         # runs the reconciliation engine's unit tests
```

## Out of scope (v2 roadmap)

- Non-Swiss official avalanche bulletins (e.g. France's Météo-France BERA or
  NASA FIRMS), which need server-side keys/proxies — the live avalanche
  bulletin here is SLF (Switzerland) only; elsewhere we fall back to the
  weather heuristic
- A real, shared guide/ranger feed (the advisory source is still seeded)
- Offline / dead-zone last-known-position capture
- Authentication
- Real crowd-sourcing at scale (a shared backend, moderation, spam handling)
- More granular waypoints than the current 6 checkpoints (see below)

These are intentionally not attempted here — the point of this build is the
reconciliation logic across genuinely different, real source types, not a
larger surface area of unfinished integrations.
