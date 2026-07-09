import { useEffect, useState } from "react";
import { fetchAvalancheBulletin } from "../lib/avalancheBulletin";
import type { OfficialAvalancheRating } from "../lib/avalancheBulletin";

// SLF issues at most a couple of bulletins per day, so a 30-minute refresh is
// plenty to stay current without hammering the endpoint.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export interface AvalancheBulletinState {
  ratings: Map<string, OfficialAvalancheRating>;
  inSeason: boolean;
  loading: boolean;
  fetchedAt: Date | null;
}

export function useAvalancheBulletin(): AvalancheBulletinState {
  const [ratings, setRatings] = useState<Map<string, OfficialAvalancheRating>>(new Map());
  const [inSeason, setInSeason] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchAvalancheBulletin();
      if (cancelled) return;
      setRatings(result.ratings);
      setInSeason(result.inSeason);
      setFetchedAt(new Date(result.fetchedAt));
      setLoading(false);
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { ratings, inSeason, loading, fetchedAt };
}
