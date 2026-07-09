import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { ReconciledWaypoint, Waypoint } from "../types";
import { STATUS_META } from "../lib/statusMeta";

interface MapViewProps {
  waypoints: Waypoint[];
  reconciled: Map<string, ReconciledWaypoint>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MapView({ waypoints, reconciled, selectedId, onSelect }: MapViewProps) {
  const center: [number, number] = [waypoints[Math.floor(waypoints.length / 2)].lat, waypoints[Math.floor(waypoints.length / 2)].lng];
  const positions: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);

  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} pathOptions={{ color: "#2a78d6", weight: 3, opacity: 0.7 }} />
      {waypoints.map((w) => {
        const result = reconciled.get(w.id);
        const meta = result ? STATUS_META[result.status] : STATUS_META.unconfirmed;
        const isSelected = w.id === selectedId;
        return (
          <CircleMarker
            key={w.id}
            center={[w.lat, w.lng]}
            radius={isSelected ? 12 : 9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: meta.color,
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(w.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>
                {w.order}. {w.name}
              </strong>
              <br />
              {meta.symbol} {meta.label}
              {result && !result.conflicting ? ` · ${result.confidence}% confidence` : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
