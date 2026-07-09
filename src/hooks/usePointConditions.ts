import { useMemo } from "react";
import type { CrowdReport, GeoPoint, PointConditions, RangerAdvisory, WeatherReading } from "../types";
import { usePointRawData } from "./usePointRawData";
import { assembleConditions } from "../lib/conditions";
import { computeSunOnSlope, type SunOnSlope } from "../lib/sun";
import { freezeThaw, windLoading } from "../lib/derivations";
import { estimateAvalancheRisk } from "../lib/avalancheRisk";
import type { TerrainInfo } from "../lib/terrain";

export interface PointConditionsResult {
  conditions: PointConditions | null;
  weather: WeatherReading | null;
  terrain: TerrainInfo | null;
  sun: SunOnSlope | null;
  loading: boolean;
  error: string | null;
}

/** Shift a local naive wall-clock string ("YYYY-MM-DDThh:mm") by whole hours. */
function shiftLocalHours(iso: string, hours: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  d.setUTCHours(d.getUTCHours() + hours);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function usePointConditions(
  point: GeoPoint | null,
  hourOffset: number,
  crowdReports: CrowdReport[],
  rangerAdvisories: RangerAdvisory[],
): PointConditionsResult {
  const raw = usePointRawData(point);

  return useMemo(() => {
    const { weather, hourly, terrain, official } = raw;
    if (!point || !weather) {
      return { conditions: null, weather, terrain, sun: null, loading: raw.loading, error: raw.error };
    }

    const referenceLocalIso = weather.localTime ? shiftLocalHours(weather.localTime, hourOffset) : null;

    const sun =
      terrain && referenceLocalIso
        ? computeSunOnSlope(
            terrain.slopeDeg,
            terrain.aspectDeg,
            point.lat,
            point.lng,
            referenceLocalIso,
            weather.utcOffsetSeconds,
          )
        : null;

    const ft = hourly ? freezeThaw(hourly, weather.localTime) : null;
    const wl = terrain ? windLoading(weather.windDirectionDeg, weather.windSpeedKph, terrain.aspectDeg) : null;

    const heuristic = estimateAvalancheRisk(weather);
    const avalanche = official
      ? { level: official.level, isOfficial: true, reason: "", regionName: official.regionName }
      : { level: heuristic.level, isOfficial: false, reason: heuristic.reason };

    const conditions = assembleConditions({
      point,
      weather,
      terrain,
      sun,
      freezeThaw: ft,
      windLoading: wl,
      avalanche,
      crowdReports,
      rangerAdvisories,
    });

    return { conditions, weather, terrain, sun, loading: raw.loading, error: raw.error };
  }, [raw, point, hourOffset, crowdReports, rangerAdvisories]);
}
