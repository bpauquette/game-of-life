import isPopulationStable from "./populationUtils";

describe("isPopulationStable", () => {
  test("returns false for empty or single sample", () => {
    expect(isPopulationStable([], 5, 0)).toBe(false);
    expect(isPopulationStable([3], 5, 0)).toBe(false);
  });

  test("detects exact stability with tolerance 0", () => {
    const h = [10, 10, 10, 10];
    expect(isPopulationStable(h, 4, 0)).toBe(true);
    expect(isPopulationStable(h, 2, 0)).toBe(true);
  });

  test("respects window size and tolerance", () => {
    const h = [10, 11, 12, 13, 12, 11];
    // full window 6, min=10 max=13 diff=3
    expect(isPopulationStable(h, 6, 3)).toBe(true);
    expect(isPopulationStable(h, 6, 2)).toBe(false);
    // last 3 samples [12,11], w=2 diff=1
    expect(isPopulationStable(h, 2, 1)).toBe(true);
  });

  test("handles window larger than history length", () => {
    const h = [5, 6, 5];
    expect(isPopulationStable(h, 10, 1)).toBe(true); // min=5 max=6 diff=1
  });
});
