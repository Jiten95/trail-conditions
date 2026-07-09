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
    note: "Loose blocks coming down the steep switchbacks just below the Faulhorn summit, a couple of close calls.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-2",
    waypointId: "wp-3",
    type: "ice",
    severity: "medium",
    note: "Icy patch on the shaded traverse just before Berghaus Männdlenen, poles recommended.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-3",
    waypointId: "wp-5",
    type: "high-wind",
    severity: "low",
    note: "Breezy down at Bachalpsee but manageable for photos.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-4",
    waypointId: "wp-4",
    type: "other",
    severity: "high",
    note: "Trail bunching up badly on the final Faulhorn climb — single-file only, groups backing up.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-5",
    waypointId: "wp-6",
    type: "high-wind",
    severity: "medium",
    note: "Wind picking up on the open slopes above First near Bachläger.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-6",
    waypointId: "wp-2",
    type: "other",
    severity: "low",
    note: "Short wait at the Oberberghorn viewpoint ladders this morning.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
  {
    id: "cr-7",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    note: "Thunderheads building over First, several groups hurrying down to the gondola.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-8",
    waypointId: "wp-1",
    type: "wildlife",
    severity: "low",
    note: "Ibex near the Schynige Platte alpine garden, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
];
