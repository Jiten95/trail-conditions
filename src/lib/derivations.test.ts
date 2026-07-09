import { describe, expect, it } from "vitest";
import { freezeThaw, windLoading } from "./derivations";
import type { HourlySeries } from "../types";

function series(temps: number[]): HourlySeries {
  const times = temps.map((_, i) => `2026-07-09T${i.toString().padStart(2, "0")}:00`);
  return { times, temperatureC: temps, windDirectionDeg: temps.map(() => 0), utcOffsetSeconds: 0 };
}

describe("freezeThaw", () => {
  it("counts crossings of 0°C and reports the current state", () => {
    const info = freezeThaw(series([-2, -1, 1, 2, -1]), null);
    expect(info).not.toBeNull();
    expect(info!.crossings).toBe(2);
    expect(info!.currentlyBelowZero).toBe(true);
    expect(info!.minC).toBe(-2);
    expect(info!.maxC).toBe(2);
  });

  it("reports no crossings for a steadily warm day", () => {
    const info = freezeThaw(series([5, 6, 7, 8]), null);
    expect(info!.crossings).toBe(0);
    expect(info!.currentlyBelowZero).toBe(false);
  });

  it("returns null without enough data", () => {
    expect(freezeThaw(series([1]), null)).toBeNull();
  });
});

describe("windLoading", () => {
  it("loads lee slopes on the downwind side", () => {
    const info = windLoading(0, 40, null); // wind from the north
    expect(info.fromCompass).toBe("N");
    expect(info.loadedAspectCompass).toBe("S");
    expect(info.transporting).toBe(true);
  });

  it("flags the point's own slope when it faces roughly downwind", () => {
    const leeward = windLoading(0, 40, 180); // wind from N, slope faces S (downwind)
    const windward = windLoading(0, 40, 0); // slope faces N (into the wind)
    expect(leeward.thisSlopeLoaded).toBe(true);
    expect(windward.thisSlopeLoaded).toBe(false);
  });

  it("is not transporting below the threshold wind speed", () => {
    expect(windLoading(0, 10, null).transporting).toBe(false);
  });
});
