import type { CrowdReport } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded crowd reports — illustrative, not real user submissions. Timestamps
// are computed relative to app load time so the decay tiers (full <6h,
// half 6-24h, low 24-72h, expired >72h) are visible on every run. Reports are
// keyed to per-route waypoint ids (sp-* Swiss, mb-* Mont Blanc), so each route
// shows its own seeded hazards.

// --- Schynige Platte -> First (main route) ---
const swissCrowdReports: CrowdReport[] = [
  {
    id: "cr-sp-1",
    waypointId: "sp-4",
    type: "rockfall",
    severity: "high",
    note: "Loose blocks coming down the steep switchbacks just below the Faulhorn summit, a couple of close calls.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-sp-2",
    waypointId: "sp-3",
    type: "ice",
    severity: "medium",
    note: "Icy patch on the shaded traverse just before Berghaus Männdlenen, poles recommended.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-sp-3",
    waypointId: "sp-5",
    type: "high-wind",
    severity: "low",
    note: "Breezy down at Bachalpsee but manageable for photos.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-sp-4",
    waypointId: "sp-4",
    type: "other",
    severity: "high",
    note: "Trail bunching up badly on the final Faulhorn climb — single-file only, groups backing up.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-sp-5",
    waypointId: "sp-6",
    type: "high-wind",
    severity: "medium",
    note: "Wind picking up on the open slopes above First near Bachläger.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-sp-6",
    waypointId: "sp-2",
    type: "other",
    severity: "low",
    note: "Short wait at the Oberberghorn viewpoint ladders this morning.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
  {
    id: "cr-sp-7",
    waypointId: "sp-7",
    type: "lightning",
    severity: "high",
    note: "Thunderheads building over First, several groups hurrying down to the gondola.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-sp-8",
    waypointId: "sp-1",
    type: "wildlife",
    severity: "low",
    note: "Ibex near the Schynige Platte alpine garden, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
];

// --- Gouter Route, Mont Blanc (backup route) ---
const gouterCrowdReports: CrowdReport[] = [
  {
    id: "cr-mb-1",
    waypointId: "mb-4",
    type: "rockfall",
    severity: "high",
    note: "Rocks coming down through the Grand Couloir most of the morning, several close calls.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-mb-2",
    waypointId: "mb-3",
    type: "ice",
    severity: "medium",
    note: "Icy traverse just below Tete Rousse, crampons recommended.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-mb-3",
    waypointId: "mb-5",
    type: "high-wind",
    severity: "low",
    note: "Gusty on the terrace outside the Gouter refuge, manageable.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-mb-4",
    waypointId: "mb-4",
    type: "other",
    severity: "high",
    note: "Long queue crossing the couloir, groups bunching up right in the fall line.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-mb-5",
    waypointId: "mb-6",
    type: "high-wind",
    severity: "medium",
    note: "Strong summit-push winds picking up above the Dome du Gouter.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-mb-6",
    waypointId: "mb-2",
    type: "other",
    severity: "low",
    note: "Long line for the Bellevue cable car this morning.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
  {
    id: "cr-mb-7",
    waypointId: "mb-7",
    type: "lightning",
    severity: "high",
    note: "Thunderheads building over the summit ridge, several parties turning back.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-mb-8",
    waypointId: "mb-1",
    type: "wildlife",
    severity: "low",
    note: "Chamois near the Les Houches trailhead, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
];

export const seedCrowdReports: CrowdReport[] = [...swissCrowdReports, ...gouterCrowdReports];
