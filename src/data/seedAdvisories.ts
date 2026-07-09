import type { RangerAdvisory } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded ranger / guide-office advisory feed — simulates a bulletin from a
// body like the Compagnie des Guides or the local high-mountain gendarmerie.
// Illustrative only; not a live integration (see README).
export const seedRangerAdvisories: RangerAdvisory[] = [
  {
    id: "ra-1",
    waypointId: "wp-4",
    type: "rockfall",
    severity: "high",
    message: "Guide office advisory: rockfall risk elevated in the Grand Couloir after overnight freeze-thaw — cross quickly, do not stop.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-2",
    waypointId: "wp-6",
    type: "high-wind",
    severity: "high",
    message: "Sustained winds above 60 km/h forecast near the Dome du Gouter; summit pushes advised to turn back if unable to shelter.",
    issuedAt: hoursAgo(4),
    source: "ranger",
  },
  {
    id: "ra-3",
    waypointId: "wp-3",
    type: "ice",
    severity: "low",
    message: "Verglas persists on the traverse below Tete Rousse in early morning shade.",
    issuedAt: hoursAgo(40),
    source: "ranger",
  },
  {
    id: "ra-4",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    message: "Afternoon thunderstorm risk on the summit ridge; guide office recommends turning back before midday if skies darken.",
    issuedAt: hoursAgo(1),
    source: "ranger",
  },
];
