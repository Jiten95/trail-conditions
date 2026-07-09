import type { WeatherReading, HourlySeries, GeoPoint } from "../types";

/**
 * Live weather from Open-Meteo (https://api.open-meteo.com/v1/forecast).
 * No API key required. This is genuinely live model output — see README for
 * what's live/modeled vs computed vs reported.
 *
 * `elevation` is passed explicitly when known: Open-Meteo's models run on a
 * coarse grid, so without a true elevation the API can downscale temperature
 * to the wrong altitude entirely — the difference between "clear, 8°C" and
 * "rain showers, 4-5°C" at a refuge 3800m up a mountain. Dropped pins with no
 * known elevation fall back to the API's own grid elevation.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_FIELDS =
  "temperature_2m,precipitation,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code";

function buildUrl(point: GeoPoint, withHourly: boolean): URL {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", point.lat.toString());
  url.searchParams.set("longitude", point.lng.toString());
  if (typeof point.elevationM === "number") {
    url.searchParams.set("elevation", point.elevationM.toString());
  }
  url.searchParams.set("current", CURRENT_FIELDS);
  url.searchParams.set("daily", "snowfall_sum,sunrise,sunset,daylight_duration");
  if (withHourly) {
    url.searchParams.set("hourly", "temperature_2m,wind_direction_10m");
  }
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");
  return url;
}

function parseReading(point: GeoPoint, data: any): WeatherReading {
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
    waypointId: point.id,
    fetchedAt: new Date().toISOString(),
    temperatureC: current.temperature_2m,
    precipitationMmHr: current.precipitation,
    rainMmHr: current.rain,
    showersMmHr: current.showers,
    snowfallCm: current.snowfall,
    windSpeedKph: current.wind_speed_10m,
    windGustsKph: current.wind_gusts_10m,
    windDirectionDeg: current.wind_direction_10m ?? 0,
    weatherCode: current.weather_code,
    recentSnowfallCm,
    sunrise: todayIdx >= 0 ? (sunrises[todayIdx] ?? null) : null,
    sunset: todayIdx >= 0 ? (sunsets[todayIdx] ?? null) : null,
    daylightSeconds: todayIdx >= 0 ? (daylights[todayIdx] ?? null) : null,
    localTime: current.time ?? null,
    utcOffsetSeconds: typeof data.utc_offset_seconds === "number" ? data.utc_offset_seconds : 0,
    source: "weather",
  };
}

function parseHourly(data: any): HourlySeries {
  return {
    times: data.hourly?.time ?? [],
    temperatureC: data.hourly?.temperature_2m ?? [],
    windDirectionDeg: data.hourly?.wind_direction_10m ?? [],
    utcOffsetSeconds: typeof data.utc_offset_seconds === "number" ? data.utc_offset_seconds : 0,
  };
}

export async function fetchWeather(point: GeoPoint): Promise<WeatherReading> {
  const res = await fetch(buildUrl(point, false).toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed for ${point.name}: ${res.status}`);
  }
  return parseReading(point, await res.json());
}

export async function fetchWeatherForWaypoints(points: GeoPoint[]): Promise<Map<string, WeatherReading>> {
  const results = await Promise.allSettled(points.map((w) => fetchWeather(w)));
  const map = new Map<string, WeatherReading>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      map.set(points[i].id, r.value);
    }
  });
  return map;
}

/**
 * Detail-view fetch: current reading plus an hourly series (past 24h + today)
 * for the deterministic freeze-thaw and sun-on-slope derivations.
 */
export async function fetchPointWeather(point: GeoPoint): Promise<{ reading: WeatherReading; hourly: HourlySeries }> {
  const res = await fetch(buildUrl(point, true).toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed for ${point.name}: ${res.status}`);
  }
  const data = await res.json();
  return { reading: parseReading(point, data), hourly: parseHourly(data) };
}
