import type { WeatherReading, Waypoint } from "../types";

/**
 * Live weather from Open-Meteo (https://api.open-meteo.com/v1/forecast).
 * No API key required. This is the one genuinely live data source in the
 * app — see README for what's live vs seeded.
 */
export async function fetchWeather(waypoint: Waypoint): Promise<WeatherReading> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", waypoint.lat.toString());
  url.searchParams.set("longitude", waypoint.lng.toString());
  url.searchParams.set("current", "temperature_2m,precipitation,wind_speed_10m,weather_code");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed for ${waypoint.name}: ${res.status}`);
  }
  const data = await res.json();
  const current = data.current;

  return {
    waypointId: waypoint.id,
    fetchedAt: new Date().toISOString(),
    temperatureC: current.temperature_2m,
    precipitationMmHr: current.precipitation,
    windSpeedKph: current.wind_speed_10m,
    weatherCode: current.weather_code,
    source: "weather",
  };
}

export async function fetchWeatherForWaypoints(waypoints: Waypoint[]): Promise<Map<string, WeatherReading>> {
  const results = await Promise.allSettled(waypoints.map((w) => fetchWeather(w)));
  const map = new Map<string, WeatherReading>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      map.set(waypoints[i].id, r.value);
    }
  });
  return map;
}
