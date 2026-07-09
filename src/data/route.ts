import type { Waypoint } from "../types";

// The Schynige Platte → First panorama trail (the "Faulhornweg"), one of the
// classic Bernese Oberland ridge hikes above Grindelwald/Interlaken. Runs the
// ridge from the Schynige Platte cog-railway station, past the Oberberghorn
// viewpoint and Berghaus Männdlenen, over the Faulhorn, down to the Bachalpsee
// and out at Grindelwald First. Coordinates/elevations are approximate
// (traced from the route's general path), not surveyed GPS — see README.
export const ROUTE_NAME = "Schynige Platte → First (Faulhornweg), Bernese Oberland";

// Only one route is wired up today; this list exists so the UI can offer a
// route picker without pretending multi-route support is built yet.
export const ROUTES: { id: string; name: string }[] = [{ id: "faulhornweg", name: ROUTE_NAME }];

// slfRegionId values were resolved from the SLF warning-region sector API
// (aws.slf.ch/api/warningregion/sector/findByLocWGS84) for each waypoint's
// coordinates, and are what the official avalanche bulletin is keyed on.
export const waypoints: Waypoint[] = [
  { id: "wp-1", name: "Schynige Platte", order: 1, lat: 46.6558, lng: 7.9068, elevationM: 1967, slfRegionId: "CH-1233" },
  { id: "wp-2", name: "Oberberghorn Viewpoint", order: 2, lat: 46.6606, lng: 7.9155, elevationM: 2069, slfRegionId: "CH-1241" },
  { id: "wp-3", name: "Berghaus Männdlenen", order: 3, lat: 46.6636, lng: 7.9508, elevationM: 2344, slfRegionId: "CH-1242" },
  { id: "wp-4", name: "Faulhorn", order: 4, lat: 46.6708, lng: 8.0258, elevationM: 2681, slfRegionId: "CH-1242" },
  { id: "wp-5", name: "Bachalpsee", order: 5, lat: 46.6646, lng: 8.03, elevationM: 2265, slfRegionId: "CH-1242" },
  { id: "wp-6", name: "Grindelwald First", order: 6, lat: 46.6588, lng: 8.054, elevationM: 2168, slfRegionId: "CH-1242" },
];
