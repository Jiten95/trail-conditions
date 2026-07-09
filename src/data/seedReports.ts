import type { CrowdReport } from "../types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

// Seeded crowd reports — illustrative, not real user submissions. Timestamps
// are computed relative to app load time so the decay tiers (full <6h,
// half 6-24h, low 24-72h, expired >72h) are visible on every run.
export const seedCrowdReports: CrowdReport[] = [
  {
    id: "cr-1",
    waypointId: "wp-5",
    type: "other",
    severity: "low",
    note: "Very busy at the Bachalpsee, lots of people at the reflection spot.",
    timestamp: hoursAgo(1),
    source: "crowd",
  },
  {
    id: "cr-2",
    waypointId: "wp-3",
    type: "ice",
    severity: "medium",
    note: "Old snow patch on the north-facing traverse just before Männdlenen, slippery early morning.",
    timestamp: hoursAgo(10),
    source: "crowd",
  },
  {
    id: "cr-3",
    waypointId: "wp-4",
    type: "high-wind",
    severity: "medium",
    note: "Strong gusts on the Faulhorn summit ridge, hard to stand near the top.",
    timestamp: hoursAgo(5),
    source: "crowd",
  },
  {
    id: "cr-4",
    waypointId: "wp-2",
    type: "other",
    severity: "low",
    note: "Steps up to the Oberberghorn viewpoint spur are congested this morning.",
    timestamp: hoursAgo(30),
    source: "crowd",
  },
  {
    id: "cr-5",
    waypointId: "wp-6",
    type: "other",
    severity: "low",
    note: "Long queue for the First gondola down to Grindelwald.",
    timestamp: hoursAgo(3),
    source: "crowd",
  },
  {
    id: "cr-6",
    waypointId: "wp-4",
    type: "lightning",
    severity: "high",
    note: "Thunderstorm built fast over the Faulhorn early afternoon, several parties turned back.",
    timestamp: hoursAgo(2),
    source: "crowd",
  },
  {
    id: "cr-7",
    waypointId: "wp-1",
    type: "wildlife",
    severity: "low",
    note: "Ibex grazing near the Schynige Platte botanical garden, kept their distance.",
    timestamp: hoursAgo(20),
    source: "crowd",
  },
  {
    id: "cr-8",
    waypointId: "wp-3",
    type: "trail-blocked",
    severity: "medium",
    note: "Snowfield still covering the path on the shaded section below Männdlenen.",
    timestamp: hoursAgo(80),
    source: "crowd",
  },
];
