import type { Waypoint } from "../types";

interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_PREFIX = "trail-conditions:route-geometry:v2:";
// BRouter is a free, no-key routing engine with real hiking profiles. Unlike
// hand-stitching raw OSM ways, it snaps to the actual trail network and
// returns a routed path that follows the marked trail between each pair of
// named waypoints. Public instance — degrade gracefully if it's unreachable.
const BROUTER_URL = "https://brouter.de/brouter";
const BROUTER_PROFILE = "hiking-beta";
const SNAP_TOLERANCE_M = 400; // routed path must start/end within this of the named waypoint
const MAX_LENGTH_RATIO = 6; // reject a route that wanders more than 6x the straight-line distance
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

function pathLengthM(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

/**
 * Route a single leg between two named waypoints via BRouter's hiking
 * profile. The result is validated against the straight-line distance so an
 * occasional wild detour (missing trail data) falls back to a straight leg
 * rather than drawing nonsense.
 */
async function fetchLeg(a: LatLng, b: LatLng): Promise<LatLng[]> {
  try {
    const lonlats = `${a.lng},${a.lat}|${b.lng},${b.lat}`;
    const url = `${BROUTER_URL}?lonlats=${encodeURIComponent(lonlats)}&profile=${BROUTER_PROFILE}&alternativeidx=0&format=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`BRouter request failed: ${res.status}`);
    const data = await res.json();

    const coords: [number, number, number?][] | undefined = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error("BRouter returned no geometry");

    const routed: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));

    // Sanity: the routed path must actually connect near both endpoints, and
    // not wander wildly further than a straight line would.
    if (haversineM(routed[0], a) > SNAP_TOLERANCE_M) throw new Error("route does not start at waypoint");
    if (haversineM(routed[routed.length - 1], b) > SNAP_TOLERANCE_M) throw new Error("route does not reach waypoint");
    const straight = haversineM(a, b);
    if (straight > 50 && pathLengthM(routed) > straight * MAX_LENGTH_RATIO) throw new Error("route wanders too far");

    // Anchor the drawn line exactly on the named markers.
    routed[0] = a;
    routed[routed.length - 1] = b;
    return routed;
  } catch {
    return [a, b]; // BRouter unreachable/slow/empty/implausible — fall back to a straight leg.
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
 * Real, trail-following geometry, routed leg-by-leg between the named
 * waypoints with BRouter's hiking profile. Falls back to a straight line for
 * any leg the router can't support — the map is never worse than a straight
 * polyline, only potentially better.
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

  // Only cache a genuinely routed path — if every leg fell back to a straight
  // line (e.g. offline first load), don't freeze that in so a later load can
  // still upgrade to the real trail.
  const isAllStraight = result.length <= waypoints.length;
  if (!isAllStraight) writeCache(waypoints, result);

  return result;
}
