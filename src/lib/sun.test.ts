import { describe, expect, it } from "vitest";
import { computeSunOnSlope, isSlopeLit, localNaiveToUtc, solarPosition } from "./sun";

describe("solarPosition", () => {
  it("puts the sun above the horizon and roughly south around midday (northern hemisphere)", () => {
    // ~solar noon at longitude 0, mid-latitude north, near summer.
    const pos = solarPosition(new Date("2026-06-21T12:00:00Z"), 47, 0);
    expect(pos.elevationDeg).toBeGreaterThan(30);
    expect(pos.azimuthDeg).toBeGreaterThan(135);
    expect(pos.azimuthDeg).toBeLessThan(225);
  });

  it("puts the sun below the horizon at local midnight", () => {
    const pos = solarPosition(new Date("2026-06-21T00:00:00Z"), 47, 0);
    expect(pos.elevationDeg).toBeLessThan(0);
  });
});

describe("isSlopeLit", () => {
  it("is false whenever the sun is below the horizon", () => {
    expect(isSlopeLit(30, 180, { elevationDeg: -5, azimuthDeg: 180 })).toBe(false);
  });

  it("lights a south-facing slope but not a steep north-facing one at a southern sun", () => {
    const sun = { elevationDeg: 30, azimuthDeg: 180 };
    expect(isSlopeLit(30, 180, sun)).toBe(true);
    expect(isSlopeLit(60, 0, sun)).toBe(false);
  });

  it("lights any flat point when the sun is up", () => {
    expect(isSlopeLit(0, null, { elevationDeg: 10, azimuthDeg: 90 })).toBe(true);
  });
});

describe("localNaiveToUtc", () => {
  it("subtracts the UTC offset from a local wall-clock time", () => {
    const utc = localNaiveToUtc("2026-07-09T12:00", 2 * 3600);
    expect(utc?.toISOString()).toBe("2026-07-09T10:00:00.000Z");
  });
});

describe("computeSunOnSlope", () => {
  it("returns a 24-hour timeline with some direct sun on a south slope in summer", () => {
    const result = computeSunOnSlope(30, 180, 46.5, 7.9, "2026-06-21T12:00", 2 * 3600);
    expect(result).not.toBeNull();
    expect(result!.timeline).toHaveLength(24);
    expect(result!.sunHoursOnSlope).toBeGreaterThan(0);
    expect(result!.litNow).toBe(true);
  });

  it("keeps a steep north-facing slope in shade far more than a south slope (low winter sun)", () => {
    // Near the winter solstice the sun stays low and southern, so a north
    // slope barely (if ever) catches it while a south slope is lit most of the day.
    const south = computeSunOnSlope(35, 180, 46.5, 7.9, "2026-12-21T12:00", 1 * 3600)!;
    const north = computeSunOnSlope(35, 0, 46.5, 7.9, "2026-12-21T12:00", 1 * 3600)!;
    expect(north.sunHoursOnSlope).toBeLessThan(south.sunHoursOnSlope);
  });
});
