import type { RangerAdvisory } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded ranger / guide-office advisory feed — simulates a bulletin from a
// body like the SAC (Swiss Alpine Club) hut wardens or the Grindelwald
// mountain guides. Illustrative only; not a live integration (see README).
export const seedRangerAdvisories: RangerAdvisory[] = [
  {
    id: "ra-1",
    waypointId: "wp-4",
    type: "lightning",
    severity: "high",
    message: "Guide-office advisory: afternoon thunderstorm risk over the Faulhorn ridge — start early and be off the exposed crest by midday.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-2",
    waypointId: "wp-3",
    type: "ice",
    severity: "low",
    message: "Lingering north-facing snow patch below Berghaus Männdlenen; poles or microspikes recommended in early-morning shade.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-3",
    waypointId: "wp-2",
    type: "high-wind",
    severity: "medium",
    message: "Gusty north-westerlies forecast along the Oberberghorn ridge this afternoon; take care on the exposed steps.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
  {
    id: "ra-4",
    waypointId: "wp-6",
    type: "other",
    severity: "low",
    message: "Last First gondola to Grindelwald departs 17:30 in the current schedule — pace the descent from Bachalpsee accordingly.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];
