import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { WaypointDetail } from "./components/WaypointDetail";
import { BottomSheet } from "./components/BottomSheet";
import { ReportsProvider, useReports } from "./state/reportsStore";
import { waypoints, ROUTES } from "./data/route";
import { seedRangerAdvisories } from "./data/seedAdvisories";
import { useWeather } from "./hooks/useWeather";
import { useTrailGeometry } from "./hooks/useTrailGeometry";
import { reconcileWaypoint } from "./lib/reconcile";
import type { ReconciledWaypoint } from "./types";

function AppContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const weatherState = useWeather(waypoints);
  const trail = useTrailGeometry(waypoints);
  const { reports } = useReports();

  const reconciled = useMemo(() => {
    const map = new Map<string, ReconciledWaypoint>();
    const now = new Date();
    for (const wp of waypoints) {
      const weather = weatherState.readings.get(wp.id);
      if (!weather) continue;
      map.set(wp.id, reconcileWaypoint(wp.id, weather, reports, seedRangerAdvisories, now));
    }
    return map;
  }, [weatherState.readings, reports]);

  const selectedWaypoint = waypoints.find((w) => w.id === selectedId) ?? null;
  const selectedResult = selectedId ? (reconciled.get(selectedId) ?? null) : null;
  const selectedWeather = selectedId ? (weatherState.readings.get(selectedId) ?? null) : null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Trail Conditions</h1>
          <div className="subtitle">
            <span className="route-select-wrap">
              <select
                className="route-select"
                aria-label="Select route"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
              >
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </span>
            {weatherState.loading && " · fetching live weather…"}
            {weatherState.error && ` · ${weatherState.error}`}
          </div>
        </div>
      </header>
      <div className="app-body">
        <div className="map-pane">
          <MapView
            waypoints={waypoints}
            path={trail.path}
            reconciled={reconciled}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        {!selectedWaypoint && <div className="map-hint">Tap a marker to view conditions or submit a report</div>}
        {selectedWaypoint && (
          <BottomSheet onClose={() => setSelectedId(null)} ariaLabel={`${selectedWaypoint.name} details`}>
            <WaypointDetail waypoint={selectedWaypoint} result={selectedResult} weather={selectedWeather} />
          </BottomSheet>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReportsProvider>
      <AppContent />
    </ReportsProvider>
  );
}
