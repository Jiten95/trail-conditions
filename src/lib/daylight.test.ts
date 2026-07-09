import { describe, expect, it } from "vitest";
import { formatDuration, getDaylightInfo } from "./daylight";

describe("formatDuration", () => {
  it("formats minutes into h/m", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(83)).toBe("1h 23m");
  });

  it("never goes negative", () => {
    expect(formatDuration(-10)).toBe("0m");
  });
});

describe("getDaylightInfo", () => {
  const sunrise = "2026-07-09T05:52";
  const sunset = "2026-07-09T21:23";

  it("reports daylight remaining during the day", () => {
    const info = getDaylightInfo(sunrise, sunset, "2026-07-09T20:00");
    expect(info.phase).toBe("daylight");
    expect(info.minutesToSunset).toBe(83);
    expect(info.sunriseLabel).toBe("05:52");
    expect(info.sunsetLabel).toBe("21:23");
    expect(info.summary).toContain("1h 23m of daylight left");
  });

  it("detects before sunrise", () => {
    const info = getDaylightInfo(sunrise, sunset, "2026-07-09T04:00");
    expect(info.phase).toBe("before-sunrise");
    expect(info.minutesToSunset).toBeNull();
  });

  it("detects after sunset", () => {
    const info = getDaylightInfo(sunrise, sunset, "2026-07-09T22:10");
    expect(info.phase).toBe("after-sunset");
    expect(info.minutesToSunset).toBeNull();
  });

  it("is timezone-agnostic (compares naive local wall-clock)", () => {
    // Even if the test host is in a different tz, the wall-clock math holds.
    const info = getDaylightInfo(sunrise, sunset, "2026-07-09T12:00");
    expect(info.phase).toBe("daylight");
    expect(info.minutesToSunset).toBe(9 * 60 + 23);
  });

  it("returns unknown when data is missing", () => {
    expect(getDaylightInfo(null, sunset, "2026-07-09T12:00").phase).toBe("unknown");
    expect(getDaylightInfo(sunrise, sunset, null).phase).toBe("unknown");
  });
});
