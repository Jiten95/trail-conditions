import { useEffect, useRef, useState } from "react";
import type { WeatherReading, Waypoint } from "../types";
import { fetchWeatherForWaypoints } from "../lib/weather";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface WeatherState {
  readings: Map<string, WeatherReading>;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}

export function useWeather(waypoints: Waypoint[]): WeatherState {
  const [readings, setReadings] = useState<Map<string, WeatherReading>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const map = await fetchWeatherForWaypoints(waypointsRef.current);
        if (cancelled) return;
        if (map.size === 0) {
          setError("Open-Meteo request failed for all waypoints.");
        } else {
          setError(null);
        }
        setReadings(map);
        setLastFetchedAt(new Date());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch live weather.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Re-fetch when the selected route (its waypoints) changes.
  }, [waypoints]);

  return { readings, loading, error, lastFetchedAt };
}
