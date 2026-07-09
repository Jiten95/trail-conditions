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
import { usePointConditions } from "./hooks/usePointConditions";
import { conditionsSeverityFor } from "./lib/conditions";
import type { ConditionsSeverity, GeoPoint } from "./types";

const pad = (n: number) => n.toString().padStart(2, "0");

function formatLastUpdated(d: Date): string {
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date} ${time}`;
}

function AppContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState(DEFAULT_ROUTE_ID);
  const [droppedPoint, setDroppedPoint] = useState<GeoPoint | null>(null);
  const [hourOffset, setHourOffset] = useState(0);

  const activeRoute = getRoute(routeId);
  const waypoints = activeRoute.waypoints;
  const weatherState = useWeather(waypoints);
  const trail = useTrailGeometry(waypoints);
  const avalanche = useAvalanche(waypoints);
  const { reports } = useReports();

  function handleRouteChange(id: string) {
    setSelectedId(null);
    setDroppedPoint(null);
    setRouteId(id);
  }

  function handleSelect(id: string) {
    setHourOffset(0);
    setSelectedId(id);
  }

  function handleMapClick(lat: number, lng: number) {
    const point: GeoPoint = { id: `pin-${Date.now()}`, name: "Dropped point", lat, lng };
    setDroppedPoint(point);
    setHourOffset(0);
    setSelectedId(point.id);
  }

  // Marker severity for the sample-objective waypoints (weather + avalanche only).
  const severityById = useMemo(() => {
    const map = new Map<string, ConditionsSeverity>();
    for (const wp of waypoints) {
      const weather = weatherState.readings.get(wp.id);
      if (!weather) continue;
      map.set(wp.id, conditionsSeverityFor(weather, avalanche.official.get(wp.id)?.level));
    }
    return map;
  }, [weatherState.readings, avalanche.official, waypoints]);

  const sampleWaypoint = waypoints.find((w) => w.id === selectedId) ?? null;
  const selectedPoint: GeoPoint | null =
    sampleWaypoint ?? (droppedPoint && droppedPoint.id === selectedId ? droppedPoint : null);

  const point = usePointConditions(selectedPoint, hourOffset, reports, seedRangerAdvisories);

  const droppedSeverity: ConditionsSeverity =
    droppedPoint && droppedPoint.id === selectedId ? (point.conditions?.conditionsSeverity ?? "unknown") : "unknown";

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Alpine Conditions</h1>
          <div className="subtitle">
            <span className="route-select-wrap">
              <select
                className="route-select"
                aria-label="Select sample objective"
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
            {!weatherState.loading && !weatherState.error && weatherState.lastFetchedAt && (
              <span className="last-updated">
                {" · "}Last updated {formatLastUpdated(weatherState.lastFetchedAt)}
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="app-body">
        <div className="map-pane">
          <MapView
            key={activeRoute.id}
            waypoints={waypoints}
            path={trail.path}
            severityById={severityById}
            selectedId={selectedId}
            onSelect={handleSelect}
            droppedPoint={droppedPoint}
            droppedSeverity={droppedSeverity}
            onMapClick={handleMapClick}
          />
        </div>
        {!selectedPoint && (
          <div className="map-hint">Tap a waypoint, or tap anywhere on the map to inspect that point</div>
        )}
        {selectedPoint && (
          <BottomSheet
            onClose={() => setSelectedId(null)}
            ariaLabel={`${selectedPoint.name} details`}
          >
            <WaypointDetail
              point={selectedPoint}
              isSample={Boolean(sampleWaypoint)}
              order={sampleWaypoint?.order}
              totalWaypoints={waypoints.length}
              conditions={point.conditions}
              weather={point.weather}
              sun={point.sun}
              loading={point.loading}
              error={point.error}
              hourOffset={hourOffset}
              onHourOffsetChange={setHourOffset}
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
