import type { CrowdReport } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded crowd reports — illustrative, not real user submissions. Timestamps
// are computed relative to app load time so the decay tiers (full <6h,
// half 6-24h, low 24-72h, expired >72h) are visible on every run.
export const seedCrowdReports: CrowdReport[] = [
  {
    id: "cr-1",
    waypointId: "wp-2",
    type: "flooding",
    severity: "high",
    note: "Ankle-deep water crossing the footbridge approach, moving fast.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-2",
    waypointId: "wp-3",
    type: "rockfall",
    severity: "medium",
    note: "Small rocks came down near the canyon narrows, no injuries.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-3",
    waypointId: "wp-4",
    type: "ice",
    severity: "low",
    note: "A few icy patches in shaded switchbacks, manageable with care.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-4",
    waypointId: "wp-4",
    type: "trail-blocked",
    severity: "high",
    note: "Fallen branch blocking the switchback, hikers going around on loose scree.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-5",
    waypointId: "wp-5",
    type: "high-wind",
    severity: "medium",
    note: "Strong gusts at the lookout, people holding onto the chains.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-6",
    waypointId: "wp-6",
    type: "other",
    severity: "low",
    note: "Crowded chains section, slow moving line.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
  {
    id: "cr-7",
    waypointId: "wp-7",
    type: "lightning",
    severity: "high",
    note: "Dark clouds building over the summit, thunder heard in the distance.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-8",
    waypointId: "wp-1",
    type: "wildlife",
    severity: "low",
    note: "Deer near the trailhead parking, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
];
