import type { Waypoint } from "../types";

// Approximate waypoints along the Angels Landing Trail, Zion National Park, UT.
// Coordinates are illustrative (traced from the trail's general path), not
// surveyed GPS data — see README for scope notes.
export const ROUTE_NAME = "Angels Landing Trail, Zion National Park";

export const waypoints: Waypoint[] = [
  { id: "wp-1", name: "The Grotto Trailhead", order: 1, lat: 37.2937, lng: -112.9482 },
  { id: "wp-2", name: "Virgin River Footbridge", order: 2, lat: 37.2951, lng: -112.9497 },
  { id: "wp-3", name: "Refrigerator Canyon", order: 3, lat: 37.297, lng: -112.952 },
  { id: "wp-4", name: "Walter's Wiggles", order: 4, lat: 37.2989, lng: -112.9536 },
  { id: "wp-5", name: "Scout Lookout", order: 5, lat: 37.2995, lng: -112.9549 },
  { id: "wp-6", name: "Chains Section", order: 6, lat: 37.3005, lng: -112.9558 },
  { id: "wp-7", name: "Angels Landing Summit", order: 7, lat: 37.3016, lng: -112.9569 },
];
