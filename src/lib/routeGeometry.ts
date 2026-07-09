import type { Waypoint } from "../types";

interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_PREFIX = "trail-conditions:route-geometry:v1:";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const PAD_DEG = 0.01; // ~1.1km padding around each leg's bounding box
const SNAP_TOLERANCE_M = 350; // stitched path must land within this of the named waypoint
const JUMP_TOLERANCE_M = 80; // max gap bridged between two way endpoints while stitching
const MAX_LENGTH_RATIO = 4; // reject a stitch that wanders more than 4x the straight-line distance
const FETCH_TIMEOUT_MS = 9000;

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Real trail segments near Mont Blanc's alpine terrain aren't bundled into a
 * single OSM "route" relation (the upper mountain isn't a marked hiking
 * trail in that sense) — but the individual path/via-ferrata/track ways
 * *are* mapped. We fetch the raw ways in a small window around each leg and
 * stitch them ourselves.
 */
async function fetchWaysNear(a: LatLng, b: LatLng): Promise<LatLng[][]> {
  const south = Math.min(a.lat, b.lat) - PAD_DEG;
  const north = Math.max(a.lat, b.lat) + PAD_DEG;
  const west = Math.min(a.lng, b.lng) - PAD_DEG;
  const east = Math.max(a.lng, b.lng) + PAD_DEG;
  const query = `[out:json][timeout:20];way["highway"~"^(path|track|via_ferrata|steps|footway)$"](${south},${west},${north},${east});out geom;`;

  const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
  const data = await res.json();

  return (data.elements ?? [])
    .filter((el: { type: string; geometry?: unknown }) => el.type === "way" && Array.isArray(el.geometry))
    .map((el: { geometry: { lat: number; lon: number }[] }) => el.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
}

/** Greedy nearest-endpoint chaining from `start` toward `end`. */
function stitch(ways: LatLng[][], start: LatLng, end: LatLng): LatLng[] | null {
  const remaining = ways.map((points) => ({ points, used: false }));
  const path: LatLng[] = [start];
  let current = start;
  let hops = 0;

  while (haversineM(current, end) > SNAP_TOLERANCE_M && hops < 60) {
    let best: { way: (typeof remaining)[number]; reversed: boolean; dist: number } | null = null;
    for (const way of remaining) {
      if (way.used || way.points.length < 2) continue;
      const first = way.points[0];
      const last = way.points[way.points.length - 1];
      const dFirst = haversineM(current, first);
      const dLast = haversineM(current, last);
      if (dFirst < JUMP_TOLERANCE_M && (!best || dFirst < best.dist)) best = { way, reversed: false, dist: dFirst };
      if (dLast < JUMP_TOLERANCE_M && (!best || dLast < best.dist)) best = { way, reversed: true, dist: dLast };
    }
    if (!best) break;
    best.way.used = true;
    const pts = best.reversed ? [...best.way.points].reverse() : best.way.points;
    path.push(...pts.slice(1));
    current = pts[pts.length - 1];
    hops += 1;
  }

  if (haversineM(current, end) > SNAP_TOLERANCE_M) return null;
  path.push(end);

  const straightLineDist = haversineM(start, end);
  let pathLength = 0;
  for (let i = 1; i < path.length; i++) pathLength += haversineM(path[i - 1], path[i]);
  if (straightLineDist > 50 && pathLength > straightLineDist * MAX_LENGTH_RATIO) return null;

  return path;
}

async function fetchLeg(a: LatLng, b: LatLng): Promise<LatLng[]> {
  try {
    const ways = await fetchWaysNear(a, b);
    return stitch(ways, a, b) ?? [a, b];
  } catch {
    return [a, b]; // Overpass unreachable/slow/empty — fall back to a straight leg.
  }
}

function cacheKeyFor(waypoints: Waypoint[]): string {
  return CACHE_PREFIX + waypoints.map((w) => w.id).join(",");
}

function readCache(waypoints: Waypoint[]): [number, number][] | null {
  try {
    const raw = localStorage.getItem(cacheKeyFor(waypoints));
    return raw ? (JSON.parse(raw) as [number, number][]) : null;
  } catch {
    return null;
  }
}

function writeCache(waypoints: Waypoint[], path: [number, number][]) {
  try {
    localStorage.setItem(cacheKeyFor(waypoints), JSON.stringify(path));
  } catch {
    // Storage unavailable — fine, we just refetch next load.
  }
}

/**
 * Real, OSM-traced trail geometry, fetched and stitched leg-by-leg between
 * the named waypoints. Falls back to a straight line for any leg the live
 * data doesn't support — the map is never worse than a straight polyline,
 * only potentially better.
 */
export async function fetchTrailGeometry(waypoints: Waypoint[]): Promise<[number, number][]> {
  const cached = readCache(waypoints);
  if (cached) return cached;

  const legs = await Promise.all(
    waypoints.slice(0, -1).map((wp, i) => {
      const a = { lat: wp.lat, lng: wp.lng };
      const b = { lat: waypoints[i + 1].lat, lng: waypoints[i + 1].lng };
      return fetchLeg(a, b);
    }),
  );

  const fullPath: LatLng[] = [legs[0][0]];
  for (const leg of legs) fullPath.push(...leg.slice(1));

  const result: [number, number][] = fullPath.map((p) => [p.lat, p.lng]);
  writeCache(waypoints, result);
  return result;
}
