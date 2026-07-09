import type { RangerAdvisory } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded ranger / trail-office advisory feed — simulates a bulletin from a
// body like the local Bergführer office, SAC hut wardens, or Grindelwald
// mountain rescue. Illustrative only; not a live integration (see README).
export const seedRangerAdvisories: RangerAdvisory[] = [
  {
    id: "ra-1",
    waypointId: "wp-4",
    type: "rockfall",
    severity: "high",
    message: "Trail office advisory: loose rock on the Faulhorn summit path after overnight freeze-thaw — watch your footing on the switchbacks.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-2",
    waypointId: "wp-6",
    type: "high-wind",
    severity: "high",
    message: "Sustained winds above 60 km/h forecast on the exposed slopes above First; consider taking the gondola down if gusts strengthen.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-3",
    waypointId: "wp-3",
    type: "ice",
    severity: "low",
    message: "Verglas persists on the shaded traverse below Berghaus Männdlenen in early morning.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-4",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    message: "Afternoon thunderstorm risk over the First ridge; trail office recommends descending before storms build.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];
