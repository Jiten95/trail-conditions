import type { CrowdReport } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded crowd reports — illustrative, not real user submissions. Timestamps
// are computed relative to app load time so the decay tiers (full <6h,
// half 6-24h, low 24-72h, expired >72h) are visible on every run.
export const seedCrowdReports: CrowdReport[] = [
  {
    id: "cr-1",
    waypointId: "wp-4",
    type: "rockfall",
    severity: "high",
    note: "Rocks coming down through the Grand Couloir most of the morning, several close calls.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-2",
    waypointId: "wp-3",
    type: "ice",
    severity: "medium",
    note: "Icy traverse just below Tete Rousse, crampons recommended.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-3",
    waypointId: "wp-5",
    type: "high-wind",
    severity: "low",
    note: "Gusty on the terrace outside the Gouter refuge, manageable.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-4",
    waypointId: "wp-4",
    type: "other",
    severity: "high",
    note: "Long queue crossing the couloir, groups bunching up right in the fall line.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-5",
    waypointId: "wp-6",
    type: "high-wind",
    severity: "medium",
    note: "Strong summit-push winds picking up above the Dome du Gouter.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-6",
    waypointId: "wp-2",
    type: "other",
    severity: "low",
    note: "Long line for the Bellevue cable car this morning.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
  {
    id: "cr-7",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    note: "Thunderheads building over the summit ridge, several parties turning back.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-8",
    waypointId: "wp-1",
    type: "wildlife",
    severity: "low",
    note: "Chamois near the Les Houches trailhead, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
];
