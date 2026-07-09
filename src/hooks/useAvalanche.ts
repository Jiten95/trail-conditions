import { useEffect, useState } from "react";
import type { Waypoint } from "../types";
import { fetchBulletin, reportForPoint, type OfficialAvalancheReport } from "../lib/slfAvalanche";

export interface AvalancheState {
  // waypointId -> official SLF report, when an active bulletin covers it.
  official: Map<string, OfficialAvalancheReport>;
  loading: boolean;
  // true once we've fetched and there was simply no active bulletin (e.g. summer).
  inSeason: boolean;
}

/**
 * Fetches the SLF bulletin once and resolves an official danger rating per
 * waypoint. Off-season (summer) the bulletin is empty, so `official` stays
 * empty and the UI falls back to the weather-derived heuristic.
 */
export function useAvalanche(waypoints: Waypoint[]): AvalancheState {
  const [official, setOfficial] = useState<Map<string, OfficialAvalancheReport>>(new Map());
  const [loading, setLoading] = useState(true);
  const [inSeason, setInSeason] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOfficial(new Map());
    setInSeason(false);
    fetchBulletin()
      .then((collection) => {
        if (cancelled || collection === null) return;
        const map = new Map<string, OfficialAvalancheReport>();
        for (const wp of waypoints) {
          const report = reportForPoint(collection, wp.lat, wp.lng);
          if (report) map.set(wp.id, report);
        }
        setOfficial(map);
        setInSeason(map.size > 0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-resolve official ratings when the selected route changes.
  }, [waypoints]);

  return { official, loading, inSeason };
}
