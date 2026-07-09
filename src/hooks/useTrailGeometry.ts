import { useEffect, useState } from "react";
import type { Waypoint } from "../types";
import { fetchTrailGeometry } from "../lib/routeGeometry";

function straightLine(waypoints: Waypoint[]): [number, number][] {
  return waypoints.map((w) => [w.lat, w.lng]);
}

export function useTrailGeometry(waypoints: Waypoint[]): { path: [number, number][]; loading: boolean } {
  const [path, setPath] = useState<[number, number][]>(() => straightLine(waypoints));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Show a straight-line placeholder for the new route immediately, then
    // upgrade to the routed path once it resolves.
    setPath(straightLine(waypoints));
    setLoading(true);
    fetchTrailGeometry(waypoints)
      .then((p) => {
        if (!cancelled) setPath(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  return { path, loading };
}
