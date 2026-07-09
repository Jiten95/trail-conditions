import { describe, expect, it } from "vitest";
import { parseSlfBulletins, dangerLevelFromMainValue, dangerLevelText } from "./avalancheBulletin";

describe("dangerLevelFromMainValue", () => {
  it("maps EAWS labels to 1-5", () => {
    expect(dangerLevelFromMainValue("low")).toBe(1);
    expect(dangerLevelFromMainValue("moderate")).toBe(2);
    expect(dangerLevelFromMainValue("considerable")).toBe(3);
    expect(dangerLevelFromMainValue("high")).toBe(4);
    expect(dangerLevelFromMainValue("very_high")).toBe(5);
  });

  it("normalises casing, spaces and hyphens", () => {
    expect(dangerLevelFromMainValue("Considerable")).toBe(3);
    expect(dangerLevelFromMainValue("Very High")).toBe(5);
    expect(dangerLevelFromMainValue("very-high")).toBe(5);
  });

  it("accepts numeric levels and rejects anything else", () => {
    expect(dangerLevelFromMainValue(3)).toBe(3);
    expect(dangerLevelFromMainValue("4")).toBe(4);
    expect(dangerLevelFromMainValue("no_rating")).toBeNull();
    expect(dangerLevelFromMainValue(9)).toBeNull();
    expect(dangerLevelFromMainValue(undefined)).toBeNull();
  });
});

describe("parseSlfBulletins", () => {
  it("returns an empty map off-season (no bulletins)", () => {
    expect(parseSlfBulletins({ bulletins: [] }).size).toBe(0);
    expect(parseSlfBulletins({}).size).toBe(0);
    expect(parseSlfBulletins(null).size).toBe(0);
  });

  it("maps every region of a bulletin to its danger level", () => {
    const ratings = parseSlfBulletins({
      bulletins: [
        {
          bulletinID: "b1",
          regions: [{ regionID: "CH-1242" }, { regionID: "CH-1233" }],
          dangerRatings: [{ mainValue: "considerable", validTimePeriod: "all_day" }],
          validTime: { startTime: "2025-02-13T07:00:00Z", endTime: "2025-02-13T16:00:00Z" },
        },
      ],
    });
    expect(ratings.get("CH-1242")?.level).toBe(3);
    expect(ratings.get("CH-1242")?.levelText).toBe(dangerLevelText(3));
    expect(ratings.get("CH-1233")?.level).toBe(3);
    expect(ratings.get("CH-1242")?.validEnd).toBe("2025-02-13T16:00:00Z");
  });

  it("takes the highest level across multiple danger ratings (elevation bands)", () => {
    const ratings = parseSlfBulletins({
      bulletins: [
        {
          regions: [{ regionID: "CH-1242" }],
          dangerRatings: [{ mainValue: "moderate" }, { mainValue: "high" }, { mainValue: "low" }],
        },
      ],
    });
    expect(ratings.get("CH-1242")?.level).toBe(4);
  });

  it("keeps the higher rating when a region appears in more than one bulletin", () => {
    const ratings = parseSlfBulletins({
      bulletins: [
        { regions: [{ regionID: "CH-1242" }], dangerRatings: [{ mainValue: "low" }] },
        { regions: [{ regionID: "CH-1242" }], dangerRatings: [{ mainValue: "considerable" }] },
      ],
    });
    expect(ratings.get("CH-1242")?.level).toBe(3);
  });

  it("skips bulletins with no recognisable danger rating", () => {
    const ratings = parseSlfBulletins({
      bulletins: [{ regions: [{ regionID: "CH-1242" }], dangerRatings: [{ mainValue: "no_rating" }] }],
    });
    expect(ratings.has("CH-1242")).toBe(false);
  });
});
