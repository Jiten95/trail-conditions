import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { WaypointDetail } from "./components/WaypointDetail";
import { ReportsProvider, useReports } from "./state/reportsStore";
import { waypoints, ROUTE_NAME } from "./data/route";
import { seedRangerAdvisories } from "./data/seedAdvisories";
import { useWeather } from "./hooks/useWeather";
import { reconcileWaypoint } from "./lib/reconcile";
import type { ReconciledWaypoint } from "./types";
import { STATUS_META } from "./lib/statusMeta";

function AppContent() {
  const [selectedId, setSelectedId] = useState<string | null>(waypoints[0].id);
  const weatherState = useWeather(waypoints);
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
  const selectedResult = selectedId ? reconciled.get(selectedId) ?? null : null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Trail Conditions</h1>
          <div className="subtitle">
            {ROUTE_NAME}
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
          <MapView waypoints={waypoints} reconciled={reconciled} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className={`detail-pane${selectedWaypoint ? "" : " empty"}`}>
          {selectedWaypoint ? (
            <WaypointDetail waypoint={selectedWaypoint} result={selectedResult} />
          ) : (
            "Select a waypoint on the map to see its reconciled status."
          )}
        </div>
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
