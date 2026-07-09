import { describe, expect, it } from "vitest";
import { compassFromDeg, slopeAspectFromGrid } from "./terrain";

const SPACING = 90;

describe("compassFromDeg", () => {
  it("maps degrees to 8-point compass", () => {
    expect(compassFromDeg(0)).toBe("N");
    expect(compassFromDeg(90)).toBe("E");
    expect(compassFromDeg(180)).toBe("S");
    expect(compassFromDeg(270)).toBe("W");
    expect(compassFromDeg(45)).toBe("NE");
    expect(compassFromDeg(360)).toBe("N");
  });
});

describe("slopeAspectFromGrid", () => {
  it("reports zero slope and null aspect for a flat grid", () => {
    const flat = [
      [100, 100, 100],
      [100, 100, 100],
      [100, 100, 100],
    ];
    const { slopeDeg, aspectDeg } = slopeAspectFromGrid(flat, SPACING);
    expect(slopeDeg).toBeCloseTo(0, 5);
    expect(aspectDeg).toBeNull();
  });

  it("faces south when the terrain drops to the south (north is higher)", () => {
    const grid = [
      [110, 110, 110],
      [100, 100, 100],
      [90, 90, 90],
    ];
    const { slopeDeg, aspectDeg } = slopeAspectFromGrid(grid, SPACING);
    expect(slopeDeg).toBeGreaterThan(0);
    expect(aspectDeg).toBeCloseTo(180, 0);
  });

  it("faces east when the terrain drops to the east (west is higher)", () => {
    const grid = [
      [110, 100, 90],
      [110, 100, 90],
      [110, 100, 90],
    ];
    const { aspectDeg } = slopeAspectFromGrid(grid, SPACING);
    expect(aspectDeg).toBeCloseTo(90, 0);
  });

  it("computes a steeper slope for a larger elevation change", () => {
    const gentle = slopeAspectFromGrid(
      [
        [105, 105, 105],
        [100, 100, 100],
        [95, 95, 95],
      ],
      SPACING,
    );
    const steep = slopeAspectFromGrid(
      [
        [200, 200, 200],
        [100, 100, 100],
        [0, 0, 0],
      ],
      SPACING,
    );
    expect(steep.slopeDeg).toBeGreaterThan(gentle.slopeDeg);
  });
});
