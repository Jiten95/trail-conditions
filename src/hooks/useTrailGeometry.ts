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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { path, loading };
}
