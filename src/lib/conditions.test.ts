import { describe, expect, it } from "vitest";
import {
  assembleConditions,
  conditionsSeverityFor,
  reportFreshness,
  weatherHazardLevel,
} from "./conditions";
import type { CrowdReport, GeoPoint, RangerAdvisory, WeatherReading } from "../types";
import type { TerrainInfo } from "./terrain";

const NOW = new Date("2026-07-09T12:00:00Z");
const POINT: GeoPoint = { id: "wp-1", name: "Test point", lat: 46.5, lng: 7.9 };

function clearWeather(): WeatherReading {
  return {
    waypointId: "wp-1",
    fetchedAt: NOW.toISOString(),
    temperatureC: 20,
    precipitationMmHr: 0,
    rainMmHr: 0,
    showersMmHr: 0,
    snowfallCm: 0,
    windSpeedKph: 10,
    windGustsKph: 15,
    windDirectionDeg: 0,
    weatherCode: 0,
    recentSnowfallCm: 0,
    sunrise: null,
    sunset: null,
    daylightSeconds: null,
    localTime: null,
    utcOffsetSeconds: 0,
    source: "weather",
  };
}

function stormyWeather(): WeatherReading {
  return { ...clearWeather(), temperatureC: 12, precipitationMmHr: 12, rainMmHr: 12, weatherCode: 65 };
}

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
}

function crowdReport(overrides: Partial<CrowdReport> = {}): CrowdReport {
  return {
    id: "cr-test",
    waypointId: "wp-1",
    type: "flooding",
    severity: "high",
    timestamp: hoursAgo(1),
    source: "crowd",
    ...overrides,
  };
}

function rangerAdvisory(overrides: Partial<RangerAdvisory> = {}): RangerAdvisory {
  return {
    id: "ra-test",
    waypointId: "wp-1",
    type: "rockfall",
    severity: "medium",
    message: "test advisory",
    issuedAt: hoursAgo(1),
    source: "ranger",
    ...overrides,
  };
}

const terrain: TerrainInfo = { elevationM: 2500, slopeDeg: 38, aspectDeg: 45, aspectCompass: "NE" };

describe("weatherHazardLevel", () => {
  it("is 0 for calm clear weather", () => {
    expect(weatherHazardLevel(clearWeather())).toBe(0);
  });
  it("rises with heavy precipitation", () => {
    expect(weatherHazardLevel(stormyWeather())).toBeGreaterThanOrEqual(2);
  });
  it("bumps up for freezing rain (ice risk)", () => {
    const freezing: WeatherReading = { ...clearWeather(), temperatureC: 0, precipitationMmHr: 2 };
    const notFreezing: WeatherReading = { ...clearWeather(), temperatureC: 10, precipitationMmHr: 2 };
    expect(weatherHazardLevel(freezing)).toBeGreaterThan(weatherHazardLevel(notFreezing));
  });
});

describe("reportFreshness", () => {
  it("labels fresh/recent/aging and expires past 72h", () => {
    expect(reportFreshness(1).expired).toBe(false);
    expect(reportFreshness(1).label).toContain("fresh");
    expect(reportFreshness(10).label).toContain("recent");
    expect(reportFreshness(40).label).toContain("aging");
    expect(reportFreshness(80).expired).toBe(true);
  });
});

describe("conditionsSeverityFor", () => {
  it("is calm for clear weather and severe for a storm", () => {
    expect(conditionsSeverityFor(clearWeather())).toBe("calm");
    expect(conditionsSeverityFor(stormyWeather())).toBe("severe");
  });
  it("escalates to severe when the official avalanche level is high", () => {
    expect(conditionsSeverityFor(clearWeather(), "high")).toBe("severe");
  });
});

describe("assembleConditions", () => {
  it("emits provenance-tagged signals and never a verdict/confidence field", () => {
    const result = assembleConditions({ point: POINT, weather: clearWeather(), now: NOW });
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("why");
    expect(result.conditionsSeverity).toBe("calm");
    // Weather + wind are always present, tagged modeled.
    const weather = result.signals.find((s) => s.kind === "weather");
    expect(weather?.provenance).toBe("modeled");
    expect(result.signals.find((s) => s.kind === "wind")).toBeDefined();
  });

  it("adds computed terrain signals when terrain is available", () => {
    const result = assembleConditions({ point: POINT, weather: clearWeather(), terrain, now: NOW });
    const slope = result.signals.find((s) => s.kind === "slope");
    const aspect = result.signals.find((s) => s.kind === "aspect");
    expect(slope?.provenance).toBe("computed");
    expect(slope?.value).toContain("38");
    expect(aspect?.value).toContain("NE");
  });

  it("tags an official avalanche rating as official and a heuristic as modeled", () => {
    const official = assembleConditions({
      point: POINT,
      weather: clearWeather(),
      avalanche: { level: "considerable", isOfficial: true, reason: "", regionName: "Test region" },
      now: NOW,
    });
    expect(official.signals.find((s) => s.kind === "avalanche")?.provenance).toBe("official");

    const heuristic = assembleConditions({
      point: POINT,
      weather: clearWeather(),
      avalanche: { level: "moderate", isOfficial: false, reason: "estimate" },
      now: NOW,
    });
    expect(heuristic.signals.find((s) => s.kind === "avalanche")?.provenance).toBe("modeled");
  });

  it("includes fresh reported observations and excludes expired ones", () => {
    const fresh = assembleConditions({
      point: POINT,
      weather: clearWeather(),
      crowdReports: [crowdReport({ timestamp: hoursAgo(1) })],
      rangerAdvisories: [rangerAdvisory({ issuedAt: hoursAgo(2) })],
      now: NOW,
    });
    const obs = fresh.signals.filter((s) => s.kind === "observation");
    expect(obs).toHaveLength(2);
    expect(obs.every((s) => s.provenance === "reported")).toBe(true);

    const expired = assembleConditions({
      point: POINT,
      weather: clearWeather(),
      crowdReports: [crowdReport({ timestamp: hoursAgo(100) })],
      now: NOW,
    });
    expect(expired.signals.filter((s) => s.kind === "observation")).toHaveLength(0);
  });

  it("only attaches observations belonging to the point", () => {
    const result = assembleConditions({
      point: POINT,
      weather: clearWeather(),
      crowdReports: [crowdReport({ waypointId: "other-point" })],
      now: NOW,
    });
    expect(result.signals.filter((s) => s.kind === "observation")).toHaveLength(0);
  });
});
