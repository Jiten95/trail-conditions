import type { GeoPoint } from "../types";

/**
 * Deterministic terrain facts for a point, computed from a Digital Elevation
 * Model — NOT modeled or predicted. Slope and aspect are the inputs a
 * mountaineer reasons about directly (a 38° NE slope holds overnight ice and
 * sits in the slab-avalanche band); the app surfaces them as facts and lets
 * the user judge. Everything here is pure except `fetchTerrain`, which samples
 * a small elevation grid and degrades to null if the source is unreachable.
 */

export interface TerrainInfo {
  elevationM: number;
  slopeDeg: number;
  aspectDeg: number | null; // 0-360 clockwise from north; null when effectively flat
  aspectCompass: string; // "NE", or "flat"
}

const COMPASS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function compassFromDeg(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return COMPASS_8[idx];
}

/**
 * Horn's method for slope + aspect from a 3x3 elevation grid. `grid` is
 * row-major with row 0 = north, columns west -> east. `spacingM` is the
 * ground distance between adjacent samples (assumed equal N-S and E-W).
 */
export function slopeAspectFromGrid(grid: number[][], spacingM: number): { slopeDeg: number; aspectDeg: number | null } {
  const [z1, z2, z3] = grid[0];
  const [z4, , z6] = grid[1];
  const [z7, z8, z9] = grid[2];

  // Gradient: gx positive to the east, gy positive to the north.
  const gx = (z3 + 2 * z6 + z9 - (z1 + 2 * z4 + z7)) / (8 * spacingM);
  const gy = (z1 + 2 * z2 + z3 - (z7 + 2 * z8 + z9)) / (8 * spacingM);

  const slopeRad = Math.atan(Math.hypot(gx, gy));
  const slopeDeg = (slopeRad * 180) / Math.PI;

  if (Math.hypot(gx, gy) < 1e-4) {
    return { slopeDeg, aspectDeg: null };
  }

  // The slope faces downhill (opposite the uphill gradient). Compass bearing
  // of a vector clockwise from north = atan2(east, north).
  const aspectDeg = ((Math.atan2(-gx, -gy) * 180) / Math.PI + 360) % 360;
  return { slopeDeg, aspectDeg };
}

function buildInfo(centerElevation: number, slopeDeg: number, aspectDeg: number | null): TerrainInfo {
  return {
    elevationM: centerElevation,
    slopeDeg,
    aspectDeg,
    aspectCompass: aspectDeg === null ? "flat" : compassFromDeg(aspectDeg),
  };
}

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const GRID_SPACING_M = 90; // ~SRTM resolution; coarse enough to be robust, fine enough to read a slope
const FETCH_TIMEOUT_MS = 9000;

/** Offsets for a 3x3 grid, row 0 = north, columns west -> east. */
function gridCoords(point: GeoPoint): { lats: number[]; lngs: number[] } {
  const dLat = GRID_SPACING_M / 111320;
  const dLng = GRID_SPACING_M / (111320 * Math.max(0.01, Math.cos((point.lat * Math.PI) / 180)));
  const lats: number[] = [];
  const lngs: number[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      lats.push(point.lat - row * dLat); // row -1 (first) is north -> higher latitude
      lngs.push(point.lng + col * dLng);
    }
  }
  return { lats, lngs };
}

/**
 * Sample a 3x3 elevation grid around the point and compute slope + aspect.
 * Returns null on any failure so callers degrade gracefully (same pattern as
 * the Overpass/SLF integrations) — the UI then just omits the terrain facts.
 */
export async function fetchTerrain(point: GeoPoint): Promise<TerrainInfo | null> {
  const { lats, lngs } = gridCoords(point);
  const url = new URL(ELEVATION_URL);
  url.searchParams.set("latitude", lats.join(","));
  url.searchParams.set("longitude", lngs.join(","));

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    const elevations: unknown = data?.elevation;
    if (!Array.isArray(elevations) || elevations.length < 9) return null;
    const values = elevations.map((v) => (typeof v === "number" ? v : Number.NaN));
    if (values.some((v) => !Number.isFinite(v))) return null;

    const grid = [values.slice(0, 3), values.slice(3, 6), values.slice(6, 9)];
    const centerElevation = grid[1][1];
    const { slopeDeg, aspectDeg } = slopeAspectFromGrid(grid, GRID_SPACING_M);
    return buildInfo(centerElevation, slopeDeg, aspectDeg);
  } catch {
    return null;
  }
}
