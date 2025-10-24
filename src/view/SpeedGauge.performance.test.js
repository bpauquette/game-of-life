/* eslint-disable sonarjs/no-duplicate-string */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import SpeedGauge from "./SpeedGauge";
import { GameMVC } from "../controller/GameMVC";

// Mock canvas for testing
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    measureText: jest.fn(() => ({ width: 10 })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
  })),
  width: 800,
  height: 600,
  style: {
    width: "800px",
    height: "600px",
  },
  getBoundingClientRect: jest.fn(() => ({
    width: 800,
    height: 600,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
  })),
  parentElement: {
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  },
};

describe("SpeedGauge Performance Metrics", () => {
  let originalPerformanceNow;
  let mockTime;

  beforeEach(() => {
    // Mock performance.now() for consistent timing
    originalPerformanceNow = window.performance.now;
    mockTime = 0;
    window.performance.now = jest.fn(() => {
      mockTime += 16.67; // Simulate 60 FPS
      return mockTime;
    });
  });

  afterEach(() => {
    window.performance.now = originalPerformanceNow;
  });

  test("Gen/s should not be zero when game is running with live cells", async () => {
    // Create a real game instance
    const game = new GameMVC(mockCanvas);
    const gameRef = { current: game };

    // Add some live cells to the game
    game.setCellAlive(5, 5, true);
    game.setCellAlive(5, 6, true);
    game.setCellAlive(6, 5, true);

    render(
      <SpeedGauge
        isVisible={true}
        gameRef={gameRef}
        onToggleVisibility={() => {}}
      />,
    );

    // Verify initial state shows 0 Gen/s
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Simulate game running with multiple generations
    await act(async () => {
      // Simulate multiple generation steps with renders
      for (let i = 0; i < 10; i++) {
        game.step(); // This will call trackGeneration()

        // Simulate a render call
        const liveCells = game.getLiveCells();
        const viewport = game.getViewport();
        game.view.render(liveCells, viewport); // This will call trackRender()

        // Small delay between generations/renders
        mockTime += 100; // Advance mock time
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait for metrics update interval
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // Check that Gen/s is now greater than 0
    const gpsLabel = screen.getByText("Gen/s:");
    // eslint-disable-next-line testing-library/no-node-access
    const gpsRow = gpsLabel.parentElement;
    // eslint-disable-next-line testing-library/no-node-access
    const gpsValueElement = gpsRow.querySelector(".metric-value");
    const gpsValue = parseInt(gpsValueElement?.textContent || "0");

    expect(gpsValue).toBeGreaterThan(0);
  });

  test("FPS should not be zero when frames are being tracked", async () => {
    // Create a real game instance
    const game = new GameMVC(mockCanvas);
    const gameRef = { current: game };

    // Add some live cells
    game.setCellAlive(10, 10, true);
    game.setCellAlive(10, 11, true);
    game.setCellAlive(11, 10, true);

    render(
      <SpeedGauge
        isVisible={true}
        gameRef={gameRef}
        onToggleVisibility={() => {}}
      />,
    );

    await act(async () => {
      // Wait for component setup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate multiple render calls (which should track FPS)
      for (let i = 0; i < 30; i++) {
        const liveCells = game.getLiveCells();
        const viewport = game.getViewport();
        game.view.render(liveCells, viewport); // This calls trackRender()

        mockTime += 16.67; // Advance mock time by ~16ms (60 FPS)
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Wait for metrics update
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // FPS should NOT be zero when frames are being tracked
    const fpsLabel = screen.getByText("FPS:");
    // eslint-disable-next-line testing-library/no-node-access
    const fpsRow = fpsLabel.parentElement;
    // eslint-disable-next-line testing-library/no-node-access
    const fpsValueElement = fpsRow.querySelector(".metric-value");
    const fpsValue = parseInt(fpsValueElement?.textContent || "0");

    expect(fpsValue).toBeGreaterThan(0);
  });

  test("Both FPS and Gen/s should be zero when game is stopped", async () => {
    const game = new GameMVC(mockCanvas);
    const gameRef = { current: game };

    render(
      <SpeedGauge
        isVisible={true}
        gameRef={gameRef}
        onToggleVisibility={() => {}}
      />,
    );

    await act(async () => {
      // Wait for setup but don't perform any game actions
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // Both should be zero when no game activity
    const metricValues = screen.getAllByText("0", {
      selector: ".metric-value",
    });
    expect(metricValues.length).toBeGreaterThanOrEqual(2); // At least FPS and Gen/s should be 0
  });
});
