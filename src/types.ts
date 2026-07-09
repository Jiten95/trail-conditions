export interface Waypoint {
  id: string;
  name: string;
  order: number;
  lat: number;
  lng: number;
  elevationM: number;
}

export type HazardType =
  | "flooding"
  | "rockfall"
  | "ice"
  | "trail-blocked"
  | "wildlife"
  | "high-wind"
  | "lightning"
  | "other";

export type Severity = "low" | "medium" | "high";

export interface CrowdReport {
  id: string;
  waypointId: string;
  type: HazardType;
  severity: Severity;
  note?: string;
  timestamp: string; // ISO
  source: "crowd";
}

export interface RangerAdvisory {
  id: string;
  waypointId: string;
  type: HazardType;
  severity: Severity;
  message: string;
  issuedAt: string; // ISO
  source: "ranger";
}

export interface WeatherReading {
  waypointId: string;
  fetchedAt: string; // ISO
  temperatureC: number;
  precipitationMmHr: number;
  rainMmHr: number;
  showersMmHr: number;
  snowfallCm: number; // current instantaneous snowfall rate
  windSpeedKph: number;
  windGustsKph: number;
  weatherCode: number;
  recentSnowfallCm: number; // sum of yesterday + today's forecasted snowfall
  source: "weather";
}

export type ReconciledStatus = "clear" | "caution" | "hazard" | "unconfirmed";

export interface SourceContribution {
  source: "weather" | "crowd" | "ranger";
  label: string;
  detail: string;
  hazardLevel: number; // 0-3
  baseWeight: number; // confidence weight before decay
  decayFactor: number; // 0-1
  effectiveWeight: number; // baseWeight * decayFactor
  ageHours?: number;
  hazardType?: HazardType; // set for crowd/ranger contributions
  severity?: Severity; // set for crowd/ranger contributions
}

export interface ReconciledWaypoint {
  waypointId: string;
  status: ReconciledStatus;
  confidence: number; // 0-100
  why: string;
  contributions: SourceContribution[];
  conflicting: boolean;
}
