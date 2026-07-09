import type { RangerAdvisory } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded ranger / trail-office advisory feed — illustrative only, not a live
// integration (see README). Keyed to per-route waypoint ids (sp-* Swiss,
// mb-* Mont Blanc).

// --- Schynige Platte -> First (main route) ---
const swissAdvisories: RangerAdvisory[] = [
  {
    id: "ra-sp-1",
    waypointId: "sp-4",
    type: "rockfall",
    severity: "high",
    message: "Trail office advisory: loose rock on the Faulhorn summit path after overnight freeze-thaw — watch your footing on the switchbacks.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-sp-2",
    waypointId: "sp-6",
    type: "high-wind",
    severity: "high",
    message: "Sustained winds above 60 km/h forecast on the exposed slopes above First; consider taking the gondola down if gusts strengthen.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-sp-3",
    waypointId: "sp-3",
    type: "ice",
    severity: "low",
    message: "Verglas persists on the shaded traverse below Berghaus Männdlenen in early morning.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-sp-4",
    waypointId: "sp-7",
    type: "lightning",
    severity: "high",
    message: "Afternoon thunderstorm risk over the First ridge; trail office recommends descending before storms build.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];

// --- Gouter Route, Mont Blanc (backup route) ---
const gouterAdvisories: RangerAdvisory[] = [
  {
    id: "ra-mb-1",
    waypointId: "mb-4",
    type: "rockfall",
    severity: "high",
    message: "Guide office advisory: rockfall risk elevated in the Grand Couloir after overnight freeze-thaw — cross quickly, do not stop.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-mb-2",
    waypointId: "mb-6",
    type: "high-wind",
    severity: "high",
    message: "Sustained winds above 60 km/h forecast near the Dome du Gouter; summit pushes advised to turn back if unable to shelter.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-mb-3",
    waypointId: "mb-3",
    type: "ice",
    severity: "low",
    message: "Verglas persists on the traverse below Tete Rousse in early morning shade.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-mb-4",
    waypointId: "mb-7",
    type: "lightning",
    severity: "high",
    message: "Afternoon thunderstorm risk on the summit ridge; guide office recommends turning back before midday if skies darken.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];

export const seedRangerAdvisories: RangerAdvisory[] = [...swissAdvisories, ...gouterAdvisories];
