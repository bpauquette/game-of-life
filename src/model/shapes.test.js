import { shapes } from "./shapes";

describe("shapes", () => {
  it("should export shapes object", () => {
    expect(shapes).toBeDefined();
    expect(typeof shapes).toBe("object");
  });

  describe("basic structure validation", () => {
    it("should have all shapes as arrays of coordinate pairs", () => {
      Object.entries(shapes).forEach(([name, shape]) => {
        expect(Array.isArray(shape)).toBe(true);

        shape.forEach((cell) => {
          expect(Array.isArray(cell)).toBe(true);
          expect(cell.length).toBe(2);
          expect(typeof cell[0]).toBe("number");
          expect(typeof cell[1]).toBe("number");
        });
      });
    });

    it("should have expected shape categories", () => {
      const expectedShapes = [
        "glider",
        "lightweightSpaceship",
        "middleweightSpaceship",
        "heavyweightSpaceship",
        "blinker",
        "toad",
        "beacon",
        "pulsar",
        "gliderGun",
        "r_pentomino",
        "acorn",
        "diehard",
        "pentadecathlon",
        "clock",
        "glider2",
        "glider3",
        "smallExploder",
        "exploder",
        "canoe",
        "hammer",
        "tub",
        "loaf",
        "boat",
      ];

      expectedShapes.forEach((shapeName) => {
        expect(shapes).toHaveProperty(shapeName);
      });
    });
  });

  describe("specific shape validation", () => {
    it("should have correct glider pattern", () => {
      expect(shapes.glider).toEqual([
        [1, 0],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ]);
    });

    it("should have correct blinker pattern", () => {
      expect(shapes.blinker).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ]);
    });

    it("should have correct toad pattern", () => {
      expect(shapes.toad).toEqual([
        [1, 0],
        [2, 0],
        [3, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ]);
    });

    it("should have correct r_pentomino pattern", () => {
      expect(shapes.r_pentomino).toEqual([
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ]);
    });

    it("should have correct tub pattern", () => {
      expect(shapes.tub).toEqual([
        [1, 0],
        [0, 1],
        [2, 1],
        [1, 2],
      ]);
    });
  });

  describe("shape size validation", () => {
    it("should have non-empty shapes", () => {
      Object.entries(shapes).forEach(([name, shape]) => {
        expect(shape.length).toBeGreaterThan(0);
      });
    });

    it("should have reasonable coordinate ranges", () => {
      Object.entries(shapes).forEach(([name, shape]) => {
        shape.forEach(([x, y]) => {
          // Coordinates should be reasonable (not extremely large)
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(1000); // Reasonable upper bound
          expect(y).toBeLessThan(1000); // Reasonable upper bound
        });
      });
    });
  });

  describe("complex patterns", () => {
    it("should have gliderGun with expected number of cells", () => {
      // Gosper glider gun has 36 cells
      expect(shapes.gliderGun.length).toBe(36); // Based on the actual pattern
    });

    it("should have pulsar with expected structure", () => {
      // Pulsar should be symmetric and have specific number of cells
      expect(shapes.pulsar.length).toBe(48);
    });

    it("should have pentadecathlon as linear oscillator", () => {
      // Pentadecathlon should be a horizontal line
      expect(shapes.pentadecathlon.length).toBe(10);
      shapes.pentadecathlon.forEach(([x, y]) => {
        expect(y).toBe(0); // All cells should be on same row
      });
    });
  });

  describe("ship patterns", () => {
    it("should have spaceships of increasing size", () => {
      expect(shapes.lightweightSpaceship.length).toBe(9);
      expect(shapes.middleweightSpaceship.length).toBe(12);
      expect(shapes.heavyweightSpaceship.length).toBe(16);
    });

    it("should have multiple glider variations", () => {
      expect(shapes.glider).toBeDefined();
      expect(shapes.glider2).toBeDefined();
      expect(shapes.glider3).toBeDefined();

      // All should have 5 cells (standard glider size)
      expect(shapes.glider.length).toBe(5);
      expect(shapes.glider2.length).toBe(5);
      expect(shapes.glider3.length).toBe(5);
    });
  });

  describe("oscillator patterns", () => {
    const oscillators = [
      "blinker",
      "toad",
      "beacon",
      "pulsar",
      "clock",
      "canoe",
    ];

    it("should have all expected oscillator patterns", () => {
      oscillators.forEach((name) => {
        expect(shapes[name]).toBeDefined();
        expect(Array.isArray(shapes[name])).toBe(true);
      });
    });
  });

  describe("still life patterns", () => {
    const stillLifes = ["tub", "loaf", "boat"];

    it("should have all expected still life patterns", () => {
      stillLifes.forEach((name) => {
        expect(shapes[name]).toBeDefined();
        expect(Array.isArray(shapes[name])).toBe(true);
      });
    });
  });
});
