import type { WeatherReading, Waypoint } from "../types";

/**
 * Live weather from Open-Meteo (https://api.open-meteo.com/v1/forecast).
 * No API key required. This is the one genuinely live data source in the
 * app — see README for what's live vs seeded.
 *
 * `elevation` is passed explicitly per waypoint: Open-Meteo's models run on a
 * coarse grid (its default 90m DEM still averages out steep alpine terrain),
 * so without a true elevation the API can downscale temperature to the
 * wrong altitude entirely — the difference between "clear, 8°C" and
 * "rain showers, 4-5°C" at a refuge 3800m up a mountain. Supplying the real
 * elevation makes it apply the lapse-rate correction against the right
 * number.
 */
export async function fetchWeather(waypoint: Waypoint): Promise<WeatherReading> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", waypoint.lat.toString());
  url.searchParams.set("longitude", waypoint.lng.toString());
  url.searchParams.set("elevation", waypoint.elevationM.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,precipitation,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m,weather_code",
  );
  url.searchParams.set("daily", "snowfall_sum,sunrise,sunset,daylight_duration");
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed for ${waypoint.name}: ${res.status}`);
  }
  const data = await res.json();
  const current = data.current;
  const dailySnowfall: (number | null)[] = data.daily?.snowfall_sum ?? [];
  const recentSnowfallCm = dailySnowfall.reduce((sum: number, v) => sum + (v ?? 0), 0);

  // With past_days=1 + forecast_days=1 the daily arrays hold [yesterday, today];
  // the last entry is today, which is what we want for sun times.
  const dailyTimes: string[] = data.daily?.time ?? [];
  const todayIdx = dailyTimes.length > 0 ? dailyTimes.length - 1 : -1;
  const sunrises: (string | null)[] = data.daily?.sunrise ?? [];
  const sunsets: (string | null)[] = data.daily?.sunset ?? [];
  const daylights: (number | null)[] = data.daily?.daylight_duration ?? [];

  return {
    waypointId: waypoint.id,
    fetchedAt: new Date().toISOString(),
    temperatureC: current.temperature_2m,
    precipitationMmHr: current.precipitation,
    rainMmHr: current.rain,
    showersMmHr: current.showers,
    snowfallCm: current.snowfall,
    windSpeedKph: current.wind_speed_10m,
    windGustsKph: current.wind_gusts_10m,
    weatherCode: current.weather_code,
    recentSnowfallCm,
    sunrise: todayIdx >= 0 ? (sunrises[todayIdx] ?? null) : null,
    sunset: todayIdx >= 0 ? (sunsets[todayIdx] ?? null) : null,
    daylightSeconds: todayIdx >= 0 ? (daylights[todayIdx] ?? null) : null,
    localTime: current.time ?? null,
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
