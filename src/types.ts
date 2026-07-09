// A bare geographic point. Sample-objective waypoints extend this; arbitrary
// dropped pins are just a GeoPoint (elevation filled in once terrain resolves).
export interface GeoPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM?: number;
}

export interface Waypoint extends GeoPoint {
  order: number;
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
  windDirectionDeg: number; // 0-360, direction the wind blows FROM
  weatherCode: number;
  recentSnowfallCm: number; // sum of yesterday + today's forecasted snowfall
  sunrise: string | null; // ISO local time of today's sunrise
  sunset: string | null; // ISO local time of today's sunset
  daylightSeconds: number | null; // total daylight duration for today
  localTime: string | null; // current time in the waypoint's local timezone
  utcOffsetSeconds: number; // waypoint's local UTC offset, for astronomy math
  source: "weather";
}

/**
 * Hourly series for a point (past 24h + rest of today), used for the
 * deterministic Tier-B derivations: freeze-thaw history from air temperature,
 * and the sun-on-slope timeline through the day. All timestamps are the
 * waypoint's local naive wall-clock ("YYYY-MM-DDThh:mm").
 */
export interface HourlySeries {
  times: string[];
  temperatureC: number[];
  windDirectionDeg: number[];
  utcOffsetSeconds: number;
}

/**
 * How a fact was obtained — this replaces the old blended confidence score.
 * We never assert a safe/unsafe verdict, so instead every fact is honestly
 * tagged with where it came from, and the user judges.
 *  - official: a real published authority feed (e.g. SLF avalanche bulletin)
 *  - modeled: numerical weather model output (Open-Meteo) or derived from it
 *  - computed: deterministic math on terrain (DEM) or astronomy (sun position)
 *  - reported: a human observation (crowd report or ranger advisory)
 */
export type Provenance = "official" | "modeled" | "computed" | "reported";

export type SignalKind =
  | "weather"
  | "wind"
  | "avalanche"
  | "slope"
  | "aspect"
  | "sun"
  | "freeze-thaw"
  | "wind-loading"
  | "daylight"
  | "observation";

/**
 * Factual conditions severity for the map marker ONLY. This describes the
 * current weather/avalanche state, it is NOT a go/no-go or trail-safety
 * verdict — the app never tells you whether to proceed.
 */
export type ConditionsSeverity = "calm" | "elevated" | "severe" | "unknown";

export interface Signal {
  kind: SignalKind;
  label: string;
  value: string;
  provenance: Provenance;
  observedAt: string | null; // ISO, when the underlying reading/observation is from
  freshness: string; // human-readable freshness ("model run, live", "3h ago", "computed")
  meaning?: string; // neutral "what this means" — never a verdict
  note?: string; // free text for a reported observation
  link?: string; // external provider link, when there is a real one
  // Only weather/avalanche signals set this; it feeds the marker severity.
  severityHint?: ConditionsSeverity;
}

export interface PointConditions {
  pointId: string;
  conditionsSeverity: ConditionsSeverity;
  signals: Signal[];
}
