import type { AvalancheRiskLevel } from "./avalancheRisk";

/**
 * Official avalanche danger from the SLF (WSL Institute for Snow and Avalanche
 * Research) public bulletin, which covers the Swiss Alps — including the
 * Bernese Oberland region this route sits in. This is a *real, live* source,
 * but avalanche bulletins are seasonal: SLF only publishes danger ratings
 * during the winter/spring avalanche season, so in summer the feed is empty
 * and this returns null (the UI then falls back to the weather-derived
 * heuristic, clearly labeled). Published as an EAWS-standard GeoJSON of
 * micro-region polygons — we match a waypoint by point-in-polygon.
 */

export const SLF_BULLETIN_URL = "https://aws.slf.ch/api/bulletin/caaml/en/geojson";
export const SLF_WEBSITE_URL = "https://www.slf.ch/en/avalanche-bulletin-and-snow-situation/";

const FETCH_TIMEOUT_MS = 9000;

export interface OfficialAvalancheReport {
  level: AvalancheRiskLevel;
  regionName: string | null;
  validUntil: string | null;
}

const EAWS_LEVEL: Record<string, AvalancheRiskLevel> = {
  "1": "low",
  "2": "moderate",
  "3": "considerable",
  "4": "high",
  "5": "very-high",
  low: "low",
  moderate: "moderate",
  considerable: "considerable",
  high: "high",
  very_high: "very-high",
  "very-high": "very-high",
  veryhigh: "very-high",
};

type GeoPosition = [number, number, ...number[]];
type LinearRing = GeoPosition[];

interface GeoGeometry {
  type: string;
  coordinates: unknown;
}

/** Ray-casting point-in-ring test. Coordinates are GeoJSON [lng, lat]. */
function pointInRing(lng: number, lat: number, ring: LinearRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** A polygon is [outerRing, ...holes]; a point counts if in the outer ring and no hole. */
function pointInPolygon(lng: number, lat: number, polygon: LinearRing[]): boolean {
  if (polygon.length === 0) return false;
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(lng, lat, polygon[h])) return false;
  }
  return true;
}

export function geometryContains(geometry: GeoGeometry | null | undefined, lng: number, lat: number): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygon(lng, lat, geometry.coordinates as LinearRing[]);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as LinearRing[][]).some((poly) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

function coerceLevel(value: unknown): AvalancheRiskLevel | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return EAWS_LEVEL[String(value)] ?? null;
  if (typeof value === "string") return EAWS_LEVEL[value.trim().toLowerCase()] ?? null;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return coerceLevel(obj.mainValue ?? obj.main_value ?? obj.value ?? obj.id);
  }
  return null;
}

const LEVEL_RANK: Record<AvalancheRiskLevel, number> = {
  unavailable: 0,
  low: 1,
  moderate: 2,
  considerable: 3,
  high: 4,
  "very-high": 5,
};

/**
 * Defensively pull a danger rating out of an EAWS/SLF region's properties.
 * Property naming varies between EAWS producers and CAAML versions, so we try
 * several shapes and take the most severe rating present.
 */
export function extractDangerLevel(props: Record<string, unknown>): AvalancheRiskLevel | null {
  const directKeys = [
    "max_danger_rating",
    "maxDangerRating",
    "max-danger-rating",
    "danger_rating",
    "dangerRating",
    "dangerLevel",
    "danger_level",
  ];
  let best: AvalancheRiskLevel | null = null;
  const consider = (lvl: AvalancheRiskLevel | null) => {
    if (lvl && (!best || LEVEL_RANK[lvl] > LEVEL_RANK[best])) best = lvl;
  };

  for (const key of directKeys) consider(coerceLevel(props[key]));

  for (const key of ["danger_ratings", "dangerRatings"]) {
    const arr = props[key];
    if (Array.isArray(arr)) for (const item of arr) consider(coerceLevel(item));
  }

  return best;
}

function extractRegionName(props: Record<string, unknown>): string | null {
  for (const key of ["name", "region", "regionName", "id_string", "id"]) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractValidUntil(props: Record<string, unknown>): string | null {
  for (const key of ["end_time", "endTime", "end-time", "endDate", "validUntil", "validEndTime"]) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

interface Feature {
  geometry?: GeoGeometry;
  properties?: Record<string, unknown>;
}

/** Pure parse: given a bulletin FeatureCollection, find the rating at a point. */
export function reportForPoint(featureCollection: unknown, lat: number, lng: number): OfficialAvalancheReport | null {
  const features = (featureCollection as { features?: Feature[] } | null)?.features;
  if (!Array.isArray(features)) return null;
  for (const feature of features) {
    if (!geometryContains(feature.geometry, lng, lat)) continue;
    const props = feature.properties ?? {};
    const level = extractDangerLevel(props);
    if (level) {
      return { level, regionName: extractRegionName(props), validUntil: extractValidUntil(props) };
    }
  }
  return null;
}

/** Fetch the live SLF bulletin FeatureCollection, or null if unreachable. */
export async function fetchBulletin(): Promise<unknown | null> {
  try {
    const res = await fetch(SLF_BULLETIN_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch the live SLF bulletin and resolve the official danger rating for a
 * point, or null when there's no active bulletin covering it (e.g. summer) or
 * the feed is unreachable — the caller falls back to the heuristic.
 */
export async function fetchOfficialAvalancheRisk(lat: number, lng: number): Promise<OfficialAvalancheReport | null> {
  const data = await fetchBulletin();
  if (data === null) return null;
  return reportForPoint(data, lat, lng);
}
