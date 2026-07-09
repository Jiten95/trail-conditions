import { describe, expect, it } from "vitest";
import { estimateAvalancheRisk } from "./avalancheRisk";
import type { WeatherReading } from "../types";

function baseWeather(overrides: Partial<WeatherReading> = {}): WeatherReading {
  return {
    waypointId: "wp-5",
    fetchedAt: new Date().toISOString(),
    temperatureC: -10,
    precipitationMmHr: 0,
    rainMmHr: 0,
    showersMmHr: 0,
    snowfallCm: 0,
    windSpeedKph: 10,
    windGustsKph: 15,
    weatherCode: 0,
    recentSnowfallCm: 0,
    source: "weather",
    ...overrides,
  };
}

describe("estimateAvalancheRisk", () => {
  it("is low with no recent snow and calm wind", () => {
    expect(estimateAvalancheRisk(baseWeather()).level).toBe("low");
  });

  it("is high with heavy recent snowfall and wind loading", () => {
    const result = estimateAvalancheRisk(baseWeather({ recentSnowfallCm: 20, windGustsKph: 55 }));
    expect(result.level).toBe("high");
  });

  it("is moderate with some fresh snow and freeze-thaw temperatures", () => {
    const result = estimateAvalancheRisk(baseWeather({ recentSnowfallCm: 3, temperatureC: 0 }));
    expect(result.level).toBe("moderate");
  });

  it("is low with a little fresh snow but no wind loading or freeze-thaw", () => {
    const result = estimateAvalancheRisk(baseWeather({ recentSnowfallCm: 1, temperatureC: -10 }));
    expect(result.level).toBe("low");
  });
});
