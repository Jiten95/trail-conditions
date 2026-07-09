# Trail Conditions

A hazard-reconciliation engine for hikers: one route, three different kinds of
signal (live weather, crowd-submitted reports, and a ranger/advisory feed),
combined into a single, explainable status per waypoint — with a visible
confidence score and a one-line "why," never a black box.

Route used for the demo: **Gouter Route (Voie Normale), Mont Blanc** — the
mountain's standard and most-climbed ascent line (7 waypoints, Les Houches
trailhead to the summit, including the Grand Couloir — the route's single
most notorious rockfall hazard).

## What's live vs. seeded — please read this before judging

| Source | Status | Detail |
|---|---|---|
| **Weather** | **Live** | Every waypoint's lat/lng (and true elevation) is sent to the [Open-Meteo forecast API](https://api.open-meteo.com/v1/forecast) (no key required) for current temperature, precipitation, snowfall, and both sustained wind and gusts. The `elevation` parameter is set explicitly per waypoint so Open-Meteo lapse-rate-corrects temperature to the real altitude — without it, a high alpine refuge can read many degrees warmer than reality because the model's grid cell defaults to a coarser, lower average elevation. Refetched every 5 minutes. |
| **Avalanche risk indicator** | **Derived from live data, not an official bulletin** | `src/lib/avalancheRisk.ts` computes a low/moderate/high estimate from the *same* live Open-Meteo call (recent snowfall + wind gusts + freeze-thaw temperature) — a transparent heuristic, not a feed from avalanche.org or any real avalanche center. Labeled as such in the UI. |
| **Crowd hazard reports** | **Seeded + live, optionally shared via Supabase** | Ships with 6-8 mock reports (`src/data/seedReports.ts`) with staggered timestamps so every decay tier is visible on load. The in-app report form adds *real* new reports to this pool immediately, which is what makes the reconciliation engine live-updating. If Supabase is configured (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — see [Backend setup](#backend-setup-supabase)), submissions are written to and read from a shared table, so reports are genuinely multi-user across browsers. **Without those env vars set, it falls back to `localStorage`** — submissions stay in your own browser, exactly as before. There is still no auth, moderation, or spam handling (see out of scope). |
| **Ranger / guide-office advisory** | **Seeded, illustrative only** | 4 mock advisories (`src/data/seedAdvisories.ts`) simulating a bulletin from a body like the Compagnie des Guides. This is **not** a real integration with any guide service, avalanche.org, or similar — it exists to demonstrate a third, higher-trust source type in the reconciliation math. |

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
   7 waypoints; marker color + symbol (never color alone) show reconciled
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

The app runs fully without any configuration — crowd reports fall back to
`localStorage`. To enable the shared, multi-user report backend, see below.

## Backend setup (Supabase)

Crowd reports can optionally be persisted to (and read from) a shared
[Supabase](https://supabase.com) table so submissions are visible across
browsers/devices instead of being local to one browser.

1. Create a Supabase project (free tier is fine).
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It
   creates the `reports` table and row-level-security policies allowing the
   public anon key to read and insert reports (this app is unauthenticated).
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon
   key (Project Settings → API):

   ```bash
   cp .env.example .env.local
   # then edit .env.local
   ```

4. Restart `npm run dev`. Submissions now round-trip through Supabase; if the
   backend is ever unreachable, the app degrades to `localStorage` rather than
   failing. Leave the env vars unset to stay in localStorage-only mode.

Both values are safe to ship in a client bundle: the anon key is a public key
gated by the row-level-security policies in the schema.

## Out of scope (v2 roadmap)

- Live integration with avalanche.org, NASA FIRMS, or a real guide/ranger feed
  (the in-app "avalanche risk" indicator is our own heuristic over live
  weather data, not a substitute for this)
- Offline / dead-zone last-known-position capture
- Authentication (the Supabase backend, when enabled, is anon-key only)
- Crowd-sourcing hardening at scale (moderation, spam handling, rate limiting)
  — the optional Supabase backend gives a genuine shared store, but none of
  these guardrails
- More granular waypoints than the current 7 checkpoints (see below)

These are intentionally not attempted here — the point of this build is the
reconciliation logic across genuinely different, real source types, not a
larger surface area of unfinished integrations.
