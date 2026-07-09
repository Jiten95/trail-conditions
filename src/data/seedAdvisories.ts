import type { RangerAdvisory } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded ranger / advisory-center feed — simulates a park ranger or avalanche
// center bulletin. Illustrative only; not a live integration (see README).
export const seedRangerAdvisories: RangerAdvisory[] = [
  {
    id: "ra-1",
    waypointId: "wp-4",
    type: "rockfall",
    severity: "medium",
    message: "Rangers noted loose rock on the upper switchbacks after recent freeze-thaw cycles.",
    issuedAt: hoursAgo(14),
    source: "ranger",
  },
  {
    id: "ra-2",
    waypointId: "wp-6",
    type: "high-wind",
    severity: "high",
    message: "Chains section advisory: sustained winds above 40 mph reported, exposed hikers should use caution.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-3",
    waypointId: "wp-3",
    type: "ice",
    severity: "low",
    message: "Shaded sections of Refrigerator Canyon may retain ice into midday this week.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-4",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    message: "Afternoon thunderstorm risk at the summit; rangers recommend turning back before midday if skies darken.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];
