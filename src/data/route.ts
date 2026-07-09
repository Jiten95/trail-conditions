import type { Waypoint } from "../types";

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
}

// --- Main route: Schynige Platte -> First (Bernese Oberland, Switzerland) ----
// One of the region's classic high-alpine day hikes, on well-marked,
// well-mapped trails. Coordinates are taken from the named OSM features;
// elevations are the features' real published altitudes (passed to Open-Meteo
// so temperature is lapse-rate-corrected to the true height — see README).
// This is the default route because its trails are fully routable (real
// trail-following renders correctly) and it sits in an official
// avalanche-bulletin region (SLF).
const schynigeFirstWaypoints: Waypoint[] = [
  { id: "sp-1", name: "Schynige Platte", order: 1, lat: 46.6522608, lng: 7.9111731, elevationM: 1967 },
  { id: "sp-2", name: "Oberberghorn", order: 2, lat: 46.6591874, lng: 7.9137003, elevationM: 2069 },
  { id: "sp-3", name: "Berghaus Männdlenen", order: 3, lat: 46.668761, lng: 7.9690066, elevationM: 2344 },
  { id: "sp-4", name: "Faulhorn", order: 4, lat: 46.6749329, lng: 7.9993238, elevationM: 2681 },
  { id: "sp-5", name: "Bachalpsee", order: 5, lat: 46.6695806, lng: 8.0209533, elevationM: 2265 },
  { id: "sp-6", name: "Bachläger", order: 6, lat: 46.6582144, lng: 8.0443091, elevationM: 2230 },
  { id: "sp-7", name: "First", order: 7, lat: 46.6504815, lng: 8.0650733, elevationM: 2168 },
];

// --- Backup route: Gouter Route (Voie Normale), Mont Blanc, France ----------
// The mountain's standard and most-climbed ascent line. Kept as a selectable
// option: coordinates are illustrative (traced from the route's general path),
// not surveyed GPS data. NOTE: the upper, glaciated legs aren't routable, so
// the trail line there falls back to straight segments, and it's outside the
// SLF (Swiss) avalanche region so the avalanche card always uses the
// weather-derived heuristic — see README for why this is the backup route.
const gouterWaypoints: Waypoint[] = [
  { id: "mb-1", name: "Les Houches Trailhead", order: 1, lat: 45.8917, lng: 6.7997, elevationM: 1008 },
  { id: "mb-2", name: "Bellevue Cable Car Station", order: 2, lat: 45.908, lng: 6.7735, elevationM: 1801 },
  { id: "mb-3", name: "Refuge de Tete Rousse", order: 3, lat: 45.8567, lng: 6.8386, elevationM: 3167 },
  { id: "mb-4", name: "Grand Couloir Crossing", order: 4, lat: 45.8574, lng: 6.8432, elevationM: 3300 },
  { id: "mb-5", name: "Refuge du Gouter", order: 5, lat: 45.8581, lng: 6.8478, elevationM: 3835 },
  { id: "mb-6", name: "Dome du Gouter", order: 6, lat: 45.8558, lng: 6.858, elevationM: 4304 },
  { id: "mb-7", name: "Mont Blanc Summit", order: 7, lat: 45.8326, lng: 6.8652, elevationM: 4808 },
];

// First entry is the default route the app loads with.
export const ROUTES: Route[] = [
  { id: "schynige-first", name: "Schynige Platte → First (Bernese Oberland)", waypoints: schynigeFirstWaypoints },
  { id: "gouter", name: "Gouter Route (Voie Normale), Mont Blanc", waypoints: gouterWaypoints },
];

export const DEFAULT_ROUTE_ID = ROUTES[0].id;

export function getRoute(id: string): Route {
  return ROUTES.find((r) => r.id === id) ?? ROUTES[0];
}

// Default route's name / waypoints, for anything that just needs "the route".
export const ROUTE_NAME = ROUTES[0].name;
export const waypoints = ROUTES[0].waypoints;
