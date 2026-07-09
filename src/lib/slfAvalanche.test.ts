import { describe, expect, it } from "vitest";
import { extractDangerLevel, geometryContains, reportForPoint } from "./slfAvalanche";

// A square polygon around the Bernese Oberland trail (~46.66N, 8.0E).
const square = {
  type: "Polygon",
  coordinates: [
    [
      [7.8, 46.6],
      [8.2, 46.6],
      [8.2, 46.7],
      [7.8, 46.7],
      [7.8, 46.6],
    ],
  ],
};

describe("geometryContains", () => {
  it("detects a point inside a polygon", () => {
    expect(geometryContains(square, 8.0, 46.66)).toBe(true);
  });

  it("rejects a point outside a polygon", () => {
    expect(geometryContains(square, 6.86, 45.83)).toBe(false); // Mont Blanc — far away
  });

  it("handles MultiPolygon", () => {
    const multi = { type: "MultiPolygon", coordinates: [square.coordinates] };
    expect(geometryContains(multi, 8.0, 46.66)).toBe(true);
  });

  it("returns false for missing/unknown geometry", () => {
    expect(geometryContains(null, 8.0, 46.66)).toBe(false);
    expect(geometryContains({ type: "Point", coordinates: [8, 46] }, 8, 46)).toBe(false);
  });
});

describe("extractDangerLevel", () => {
  it("maps numeric EAWS codes", () => {
    expect(extractDangerLevel({ max_danger_rating: 3 })).toBe("considerable");
    expect(extractDangerLevel({ danger_rating: "4" })).toBe("high");
  });

  it("maps string danger words", () => {
    expect(extractDangerLevel({ maxDangerRating: "moderate" })).toBe("moderate");
    expect(extractDangerLevel({ dangerRating: "very_high" })).toBe("very-high");
  });

  it("reads nested rating objects and arrays, taking the most severe", () => {
    expect(extractDangerLevel({ "max-danger-rating": { value: "2" } })).toBe("moderate");
    expect(
      extractDangerLevel({ danger_ratings: [{ mainValue: "2" }, { mainValue: "4" }] }),
    ).toBe("high");
  });

  it("returns null when no rating is present", () => {
    expect(extractDangerLevel({ name: "Region" })).toBeNull();
  });
});

describe("reportForPoint", () => {
  const winterBulletin = {
    type: "FeatureCollection",
    features: [
      {
        geometry: square,
        properties: { name: "Berner Oberland", max_danger_rating: 3, end_time: "2026-01-15T17:00:00Z" },
      },
    ],
  };

  it("resolves an official rating for a point inside an active region", () => {
    const report = reportForPoint(winterBulletin, 46.66, 8.0);
    expect(report).not.toBeNull();
    expect(report?.level).toBe("considerable");
    expect(report?.regionName).toBe("Berner Oberland");
    expect(report?.validUntil).toBe("2026-01-15T17:00:00Z");
  });

  it("returns null for a point outside every region", () => {
    expect(reportForPoint(winterBulletin, 45.83, 6.86)).toBeNull();
  });

  it("returns null for an empty (off-season) bulletin", () => {
    expect(reportForPoint({ type: "FeatureCollection", features: [] }, 46.66, 8.0)).toBeNull();
    expect(reportForPoint(null, 46.66, 8.0)).toBeNull();
  });
});
