import { useEffect, useState } from "react";
import type { GeoPoint, HourlySeries, WeatherReading } from "../types";
import { fetchPointWeather } from "../lib/weather";
import { fetchTerrain, type TerrainInfo } from "../lib/terrain";
import { fetchOfficialAvalancheRisk, type OfficialAvalancheReport } from "../lib/slfAvalanche";

export interface PointRawData {
  weather: WeatherReading | null;
  hourly: HourlySeries | null;
  terrain: TerrainInfo | null;
  official: OfficialAvalancheReport | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: PointRawData = { weather: null, hourly: null, terrain: null, official: null, loading: false, error: null };

/**
 * Fetches everything the detail view needs for one point: live weather + an
 * hourly series (for freeze-thaw / sun timeline), a sampled terrain grid
 * (slope + aspect), and any official SLF avalanche rating covering the point.
 * Terrain and avalanche degrade to null independently, so a point always at
 * least shows its weather.
 */
export function usePointRawData(point: GeoPoint | null): PointRawData {
  const [data, setData] = useState<PointRawData>(EMPTY);
  const key = point ? `${point.id}:${point.lat.toFixed(5)},${point.lng.toFixed(5)}` : null;

  useEffect(() => {
    if (!point) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;
    setData((prev) => ({ ...prev, loading: true, error: null }));

    const weatherP = fetchPointWeather(point);
    const terrainP = fetchTerrain(point);
    const avalancheP = fetchOfficialAvalancheRisk(point.lat, point.lng);

    weatherP
      .then(async ({ reading, hourly }) => {
        const [terrain, official] = await Promise.all([
          terrainP.catch(() => null),
          avalancheP.catch(() => null),
        ]);
        if (cancelled) return;
        setData({ weather: reading, hourly, terrain, official, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setData({ ...EMPTY, error: e instanceof Error ? e.message : "Failed to load conditions." });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}
