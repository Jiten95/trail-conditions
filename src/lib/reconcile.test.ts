import { describe, expect, it } from "vitest";
import { decayFactor, reconcileWaypoint, weatherHazardLevel } from "./reconcile";
import type { CrowdReport, RangerAdvisory, WeatherReading } from "../types";

const NOW = new Date("2026-07-09T12:00:00Z");

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
    weatherCode: 0,
    recentSnowfallCm: 0,
    source: "weather",
  };
}

function stormyWeather(): WeatherReading {
  return {
    waypointId: "wp-1",
    fetchedAt: NOW.toISOString(),
    temperatureC: 12,
    precipitationMmHr: 12,
    rainMmHr: 12,
    showersMmHr: 0,
    snowfallCm: 0,
    windSpeedKph: 20,
    windGustsKph: 35,
    weatherCode: 65,
    recentSnowfallCm: 0,
    source: "weather",
  };
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

describe("decayFactor", () => {
  it("gives full weight under 6 hours", () => {
    expect(decayFactor(0)).toBe(1);
    expect(decayFactor(5.9)).toBe(1);
  });
  it("gives half weight from 6-24 hours", () => {
    expect(decayFactor(6)).toBe(0.5);
    expect(decayFactor(23.9)).toBe(0.5);
  });
  it("gives low weight from 24-72 hours", () => {
    expect(decayFactor(24)).toBe(0.2);
    expect(decayFactor(71.9)).toBe(0.2);
  });
  it("expires past 72 hours", () => {
    expect(decayFactor(72)).toBe(0);
    expect(decayFactor(200)).toBe(0);
  });
});

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

describe("reconcileWaypoint", () => {
  it("returns clear status with no reports and calm weather", () => {
    const result = reconcileWaypoint("wp-1", clearWeather(), [], [], NOW);
    expect(result.status).toBe("clear");
    expect(result.conflicting).toBe(false);
    expect(result.contributions).toHaveLength(1);
  });

  it("flags hazard when weather and a fresh crowd report agree", () => {
    const result = reconcileWaypoint(
      "wp-1",
      stormyWeather(),
      [crowdReport({ type: "flooding", severity: "high", timestamp: hoursAgo(1) })],
      [],
      NOW,
    );
    expect(result.status).toBe("hazard");
    expect(result.conflicting).toBe(false);
    expect(result.why).toContain("Flagged hazard");
  });

  it("marks unconfirmed when weather is clear but a fresh weather-correlated report flags a hazard", () => {
    const result = reconcileWaypoint(
      "wp-1",
      clearWeather(),
      [crowdReport({ type: "flooding", severity: "high", timestamp: hoursAgo(1) })],
      [],
      NOW,
    );
    expect(result.status).toBe("unconfirmed");
    expect(result.conflicting).toBe(true);
    expect(result.why).toContain("conflicting signals");
  });

  it("does not treat a non-weather hazard type (rockfall) as conflicting with clear weather", () => {
    const result = reconcileWaypoint(
      "wp-1",
      clearWeather(),
      [],
      [rangerAdvisory({ type: "rockfall", severity: "medium", issuedAt: hoursAgo(1) })],
      NOW,
    );
    expect(result.conflicting).toBe(false);
    // Independent hazard should still push status away from purely "clear".
    expect(result.status).not.toBe("clear");
  });

  it("excludes expired (>72h) crowd reports from the score", () => {
    const withOldReport = reconcileWaypoint(
      "wp-1",
      clearWeather(),
      [crowdReport({ type: "flooding", severity: "high", timestamp: hoursAgo(100) })],
      [],
      NOW,
    );
    const withNoReport = reconcileWaypoint("wp-1", clearWeather(), [], [], NOW);
    expect(withOldReport.status).toBe(withNoReport.status);
    expect(withOldReport.confidence).toBe(withNoReport.confidence);
    const reportContribution = withOldReport.contributions.find((c) => c.source === "crowd");
    expect(reportContribution?.effectiveWeight).toBe(0);
  });

  it("gives higher confidence when ranger and crowd corroborate weather than weather alone", () => {
    const weatherOnly = reconcileWaypoint("wp-1", stormyWeather(), [], [], NOW);
    const corroborated = reconcileWaypoint(
      "wp-1",
      stormyWeather(),
      [crowdReport({ type: "flooding", severity: "high", timestamp: hoursAgo(1) })],
      [rangerAdvisory({ type: "flooding", severity: "high", issuedAt: hoursAgo(1) })],
      NOW,
    );
    expect(corroborated.confidence).toBeGreaterThan(weatherOnly.confidence);
  });

  it("decays an older report's influence relative to a fresh one of the same severity", () => {
    const fresh = reconcileWaypoint(
      "wp-1",
      clearWeather(),
      [],
      [rangerAdvisory({ type: "rockfall", severity: "high", issuedAt: hoursAgo(1) })],
      NOW,
    );
    const stale = reconcileWaypoint(
      "wp-1",
      clearWeather(),
      [],
      [rangerAdvisory({ type: "rockfall", severity: "high", issuedAt: hoursAgo(30) })],
      NOW,
    );
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });
});
