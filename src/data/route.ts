import type { Waypoint } from "../types";

// Waypoints along the Schynige Platte -> First panorama trail in the Bernese
// Oberland (Switzerland) — one of the region's classic high-alpine day hikes,
// on well-marked, well-mapped trails. Coordinates are taken from the named
// OSM features; elevations are the features' real published altitudes (passed
// to Open-Meteo so temperature is lapse-rate-corrected to the true height —
// see README). This route was chosen over Mont Blanc's Gouter Route because
// its trails are fully routable (real trail-following renders correctly) and
// it sits in an official avalanche-bulletin region (SLF), unlike the Gouter
// Route's glaciated upper legs.
export const ROUTE_NAME = "Schynige Platte → First (Bernese Oberland)";

// Only one route is wired up today; this list exists so the UI can offer a
// route picker without pretending multi-route support is built yet.
export const ROUTES: { id: string; name: string }[] = [{ id: "schynige-first", name: ROUTE_NAME }];

export const waypoints: Waypoint[] = [
  { id: "wp-1", name: "Schynige Platte", order: 1, lat: 46.6522608, lng: 7.9111731, elevationM: 1967 },
  { id: "wp-2", name: "Oberberghorn", order: 2, lat: 46.6591874, lng: 7.9137003, elevationM: 2069 },
  { id: "wp-3", name: "Berghaus Männdlenen", order: 3, lat: 46.668761, lng: 7.9690066, elevationM: 2344 },
  { id: "wp-4", name: "Faulhorn", order: 4, lat: 46.6749329, lng: 7.9993238, elevationM: 2681 },
  { id: "wp-5", name: "Bachalpsee", order: 5, lat: 46.6695806, lng: 8.0209533, elevationM: 2265 },
  { id: "wp-6", name: "Bachläger", order: 6, lat: 46.6582144, lng: 8.0443091, elevationM: 2230 },
  { id: "wp-7", name: "First", order: 7, lat: 46.6504815, lng: 8.0650733, elevationM: 2168 },
];
