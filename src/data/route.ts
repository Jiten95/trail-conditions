import type { Waypoint } from "../types";

// Approximate waypoints along the Gouter Route (Voie Normale) up Mont Blanc —
// the mountain's standard and most-climbed ascent line. Coordinates are
// illustrative (traced from the route's general path), not surveyed GPS
// data — see README for scope notes.
export const ROUTE_NAME = "Gouter Route (Voie Normale), Mont Blanc";

export const waypoints: Waypoint[] = [
  { id: "wp-1", name: "Les Houches Trailhead", order: 1, lat: 45.8917, lng: 6.7997, elevationM: 1008 },
  { id: "wp-2", name: "Bellevue Cable Car Station", order: 2, lat: 45.908, lng: 6.7735, elevationM: 1801 },
  { id: "wp-3", name: "Refuge de Tete Rousse", order: 3, lat: 45.8567, lng: 6.8386, elevationM: 3167 },
  { id: "wp-4", name: "Grand Couloir Crossing", order: 4, lat: 45.8574, lng: 6.8432, elevationM: 3300 },
  { id: "wp-5", name: "Refuge du Gouter", order: 5, lat: 45.8581, lng: 6.8478, elevationM: 3835 },
  { id: "wp-6", name: "Dome du Gouter", order: 6, lat: 45.8558, lng: 6.858, elevationM: 4304 },
  { id: "wp-7", name: "Mont Blanc Summit", order: 7, lat: 45.8326, lng: 6.8652, elevationM: 4808 },
];
