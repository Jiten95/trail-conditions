import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { WaypointDetail } from "./components/WaypointDetail";
import { BottomSheet } from "./components/BottomSheet";
import { ReportsProvider, useReports } from "./state/reportsStore";
import { ROUTES, DEFAULT_ROUTE_ID, getRoute } from "./data/route";
import { seedRangerAdvisories } from "./data/seedAdvisories";
import { useWeather } from "./hooks/useWeather";
import { useTrailGeometry } from "./hooks/useTrailGeometry";
import { useAvalanche } from "./hooks/useAvalanche";
import { reconcileWaypoint } from "./lib/reconcile";
import type { ReconciledWaypoint } from "./types";
import { STATUS_META } from "./lib/statusMeta";

function AppContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState(DEFAULT_ROUTE_ID);
  const activeRoute = getRoute(routeId);
  const waypoints = activeRoute.waypoints;
  const weatherState = useWeather(waypoints);
  const trail = useTrailGeometry(waypoints);
  const avalanche = useAvalanche(waypoints);
  const { reports } = useReports();

  function handleRouteChange(id: string) {
    setSelectedId(null);
    setRouteId(id);
  }

  const reconciled = useMemo(() => {
    const map = new Map<string, ReconciledWaypoint>();
    const now = new Date();
    for (const wp of waypoints) {
      const weather = weatherState.readings.get(wp.id);
      if (!weather) continue;
      map.set(wp.id, reconcileWaypoint(wp.id, weather, reports, seedRangerAdvisories, now));
    }
    return map;
  }, [weatherState.readings, reports, waypoints]);

  const selectedWaypoint = waypoints.find((w) => w.id === selectedId) ?? null;
  const selectedResult = selectedId ? (reconciled.get(selectedId) ?? null) : null;
  const selectedWeather = selectedId ? (weatherState.readings.get(selectedId) ?? null) : null;
  const selectedAvalanche = selectedId ? (avalanche.official.get(selectedId) ?? null) : null;

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
                onChange={(e) => handleRouteChange(e.target.value)}
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
        <div className="legend">
          {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((key) => {
            const meta = STATUS_META[key];
            return (
              <div className="legend-item" key={key}>
                <span className="legend-dot" style={{ background: meta.color }}>
                  {meta.symbol}
                </span>
                {meta.label}
              </div>
            );
          })}
        </div>
      </header>
      <div className="app-body">
        <div className="map-pane">
          <MapView
            key={activeRoute.id}
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
            <WaypointDetail
              waypoint={selectedWaypoint}
              routeWaypoints={waypoints}
              result={selectedResult}
              weather={selectedWeather}
              avalancheOfficial={selectedAvalanche}
            />
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
