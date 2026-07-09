import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { ConditionsSeverity, GeoPoint, Waypoint } from "../types";
import { SEVERITY_META } from "../lib/statusMeta";

interface MapViewProps {
  waypoints: Waypoint[];
  path: [number, number][];
  severityById: Map<string, ConditionsSeverity>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  droppedPoint: GeoPoint | null;
  droppedSeverity: ConditionsSeverity;
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapView({
  waypoints,
  path,
  severityById,
  selectedId,
  onSelect,
  droppedPoint,
  droppedSeverity,
  onMapClick,
}: MapViewProps) {
  const center: [number, number] = [
    waypoints[Math.floor(waypoints.length / 2)].lat,
    waypoints[Math.floor(waypoints.length / 2)].lng,
  ];

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      <Polyline positions={path} pathOptions={{ color: "#2a78d6", weight: 3, opacity: 0.7 }} />
      {waypoints.map((w) => {
        const severity = severityById.get(w.id) ?? "unknown";
        const meta = SEVERITY_META[severity];
        const isSelected = w.id === selectedId;
        return (
          <CircleMarker
            key={w.id}
            center={[w.lat, w.lng]}
            radius={isSelected ? 12 : 9}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: meta.color, fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect(w.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>
                {w.order}. {w.name}
              </strong>
              <br />
              {meta.symbol} {meta.label}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {droppedPoint && (
        <CircleMarker
          center={[droppedPoint.lat, droppedPoint.lng]}
          radius={droppedPoint.id === selectedId ? 13 : 10}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: SEVERITY_META[droppedSeverity].color,
            fillOpacity: 1,
            dashArray: "3 3",
          }}
          eventHandlers={{ click: () => onSelect(droppedPoint.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>Dropped point</strong>
            <br />
            {SEVERITY_META[droppedSeverity].symbol} {SEVERITY_META[droppedSeverity].label}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
