export type DangerLevel = 1 | 2 | 3 | 4 | 5;

export interface OfficialAvalancheRating {
  regionId: string;
  level: DangerLevel;
  levelText: string; // EAWS label, e.g. "Considerable"
  validStart?: string;
  validEnd?: string;
  bulletinId?: string;
  source: "SLF";
}

export interface AvalancheBulletinResult {
  /** regionId (e.g. "CH-1242") → official rating */
  ratings: Map<string, OfficialAvalancheRating>;
  /** true when SLF returned at least one active bulletin (i.e. in season) */
  inSeason: boolean;
  fetchedAt: string;
}

// SLF publishes the Swiss avalanche bulletin as CAAMLv6 JSON, key-less and
// CORS-open, under CC BY 4.0. It is seasonal: bulletins are issued roughly
// November–May, so out of season the endpoint returns an empty list and we
// fall back to the weather heuristic (see avalancheRisk.ts).
const SLF_BULLETIN_URL = "https://aws.slf.ch/api/bulletin/caaml/en/json";
const FETCH_TIMEOUT_MS = 9000;

const MAIN_VALUE_TO_LEVEL: Record<string, DangerLevel> = {
  low: 1,
  moderate: 2,
  considerable: 3,
  high: 4,
  very_high: 5,
};

const LEVEL_TEXT: Record<DangerLevel, string> = {
  1: "Low",
  2: "Moderate",
  3: "Considerable",
  4: "High",
  5: "Very high",
};

export function dangerLevelFromMainValue(raw: unknown): DangerLevel | null {
  if (typeof raw === "number" && raw >= 1 && raw <= 5) return raw as DangerLevel;
  if (typeof raw === "string") {
    const key = raw.trim().toLowerCase().replace(/[\s-]/g, "_");
    if (key in MAIN_VALUE_TO_LEVEL) return MAIN_VALUE_TO_LEVEL[key];
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= 5) return n as DangerLevel;
  }
  return null;
}

export function dangerLevelText(level: DangerLevel): string {
  return LEVEL_TEXT[level];
}

interface CaamlDangerRating {
  mainValue?: unknown;
}

interface CaamlBulletin {
  bulletinID?: string;
  regions?: { regionID?: string }[];
  dangerRatings?: CaamlDangerRating[];
  validTime?: { startTime?: string; endTime?: string };
}

/**
 * Parse the SLF CAAMLv6 payload into a regionId → rating map. A bulletin can
 * cover several regions and carry several danger ratings (per elevation band /
 * time window); we take the highest applicable level per region, which is the
 * conservative choice for a hazard readout.
 */
export function parseSlfBulletins(payload: unknown): Map<string, OfficialAvalancheRating> {
  const ratings = new Map<string, OfficialAvalancheRating>();
  const bulletins = (payload as { bulletins?: CaamlBulletin[] })?.bulletins;
  if (!Array.isArray(bulletins)) return ratings;

  for (const bulletin of bulletins) {
    let maxLevel: DangerLevel | null = null;
    for (const dr of bulletin.dangerRatings ?? []) {
      const level = dangerLevelFromMainValue(dr.mainValue);
      if (level !== null && (maxLevel === null || level > maxLevel)) maxLevel = level;
    }
    if (maxLevel === null) continue;

    for (const region of bulletin.regions ?? []) {
      const regionId = region.regionID;
      if (!regionId) continue;
      const existing = ratings.get(regionId);
      if (existing && existing.level >= maxLevel) continue;
      ratings.set(regionId, {
        regionId,
        level: maxLevel,
        levelText: dangerLevelText(maxLevel),
        validStart: bulletin.validTime?.startTime,
        validEnd: bulletin.validTime?.endTime,
        bulletinId: bulletin.bulletinID,
        source: "SLF",
      });
    }
  }
  return ratings;
}

export async function fetchAvalancheBulletin(): Promise<AvalancheBulletinResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(SLF_BULLETIN_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`SLF bulletin request failed: ${res.status}`);
    const data = await res.json();
    const ratings = parseSlfBulletins(data);
    return { ratings, inSeason: ratings.size > 0, fetchedAt };
  } catch {
    // Off-season, network failure, or slow SLF endpoint — degrade to no
    // official bulletin, and let the UI fall back to the heuristic.
    return { ratings: new Map(), inSeason: false, fetchedAt };
  }
}
