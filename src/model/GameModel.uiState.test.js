// GameModel.uiState.test.js - Tests for UI state management in GameModel
import { GameModel } from "./GameModel";

describe("GameModel UI State Management", () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  describe("dialog state management", () => {
    test("should initialize with all dialogs closed", () => {
      expect(model.isDialogOpen("help")).toBe(false);
      expect(model.isDialogOpen("about")).toBe(false);
      expect(model.isDialogOpen("options")).toBe(false);
      expect(model.isDialogOpen("palette")).toBe(false);
      expect(model.isDialogOpen("captureDialog")).toBe(false);
      expect(model.isDialogOpen("saveDialog")).toBe(false);
      expect(model.isDialogOpen("loadDialog")).toBe(false);
    });

    test("should open and close dialogs", () => {
      model.openDialog("help");
      expect(model.isDialogOpen("help")).toBe(true);

      model.closeDialog("help");
      expect(model.isDialogOpen("help")).toBe(false);
    });

    test("should notify observers when opening dialogs", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.openDialog("about");

      expect(observer).toHaveBeenCalledWith("uiStateChanged", {
        type: "dialogOpen",
        dialog: "about",
        open: true,
      });
    });

    test("should notify observers when closing dialogs", () => {
      model.openDialog("options");

      const observer = jest.fn();
      model.addObserver(observer);

      model.closeDialog("options");

      expect(observer).toHaveBeenCalledWith("uiStateChanged", {
        type: "dialogClose",
        dialog: "options",
        open: false,
      });
    });

    test("should handle invalid dialog names gracefully", () => {
      expect(() => {
        model.openDialog("invalidDialog");
      }).not.toThrow();

      expect(model.isDialogOpen("invalidDialog")).toBe(false);
    });

    test("should support multiple dialogs open simultaneously", () => {
      model.openDialog("help");
      model.openDialog("about");

      expect(model.isDialogOpen("help")).toBe(true);
      expect(model.isDialogOpen("about")).toBe(true);
    });
  });

  describe("UI state management", () => {
    test("should set and get UI state values", () => {
      model.setUIState("showChart", true);
      expect(model.getUIState("showChart")).toBe(true);

      model.setUIState("maxFPS", 120);
      expect(model.getUIState("maxFPS")).toBe(120);
    });

    test("should notify observers when UI state changes", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.setUIState("showSpeedGauge", false);

      expect(observer).toHaveBeenCalledWith("uiStateChanged", {
        type: "stateChange",
        key: "showSpeedGauge",
        value: false,
      });
    });

    test("should not notify observers when setting same value", () => {
      model.setUIState("popWindowSize", 15);

      const observer = jest.fn();
      model.addObserver(observer);

      model.setUIState("popWindowSize", 15); // Same value

      expect(observer).not.toHaveBeenCalled();
    });

    test("should return all UI state", () => {
      model.setUIState("showChart", true);
      model.setUIState("maxFPS", 90);

      const allState = model.getAllUIState();

      expect(allState.showChart).toBe(true);
      expect(allState.maxFPS).toBe(90);
      expect(allState.showSpeedGauge).toBe(true); // Default value
    });

    test("should return defensive copy of UI state", () => {
      const state1 = model.getAllUIState();
      const state2 = model.getAllUIState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values

      // Mutating returned state should not affect internal state
      state1.showChart = true;
      expect(model.getUIState("showChart")).toBe(false);
    });
  });

  describe("convenience methods", () => {
    test("should toggle chart visibility", () => {
      expect(model.getUIState("showChart")).toBe(false);

      model.toggleChart();
      expect(model.getUIState("showChart")).toBe(true);

      model.toggleChart();
      expect(model.getUIState("showChart")).toBe(false);
    });

    test("should toggle speed gauge visibility", () => {
      expect(model.getUIState("showSpeedGauge")).toBe(true);

      model.toggleSpeedGauge();
      expect(model.getUIState("showSpeedGauge")).toBe(false);

      model.toggleSpeedGauge();
      expect(model.getUIState("showSpeedGauge")).toBe(true);
    });
  });

  describe("capture data management", () => {
    test("should set and get capture data", () => {
      const testData = {
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        width: 2,
        height: 2,
      };

      model.setCaptureData(testData);
      expect(model.getCaptureData()).toBe(testData);
    });

    test("should auto-open capture dialog when setting data", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      const testData = { cells: [], width: 1, height: 1 };
      model.setCaptureData(testData);

      expect(model.isDialogOpen("captureDialog")).toBe(true);
      expect(observer).toHaveBeenCalledWith("uiStateChanged", {
        type: "captureDataChanged",
        data: testData,
      });
    });

    test("should handle null capture data", () => {
      const testData = { cells: [], width: 1, height: 1 };
      model.setCaptureData(testData);

      model.setCaptureData(null);
      expect(model.getCaptureData()).toBe(null);
    });
  });

  describe("performance settings", () => {
    test("should set and get max FPS with clamping", () => {
      model.setMaxFPS(120);
      expect(model.getMaxFPS()).toBe(120);

      // Test clamping
      model.setMaxFPS(300);
      expect(model.getMaxFPS()).toBe(240); // Clamped to max

      model.setMaxFPS(0);
      expect(model.getMaxFPS()).toBe(1); // Clamped to min
    });

    test("should set and get max GPS with clamping", () => {
      model.setMaxGPS(45);
      expect(model.getMaxGPS()).toBe(45);

      // Test clamping
      model.setMaxGPS(150);
      expect(model.getMaxGPS()).toBe(120); // Clamped to max

      model.setMaxGPS(-5);
      expect(model.getMaxGPS()).toBe(1); // Clamped to min
    });
  });

  describe("population stability settings", () => {
    test("should set and get population window size with clamping", () => {
      model.setPopulationWindowSize(25);
      expect(model.getPopulationWindowSize()).toBe(25);

      // Test clamping
      model.setPopulationWindowSize(150);
      expect(model.getPopulationWindowSize()).toBe(100); // Clamped to max

      model.setPopulationWindowSize(2);
      expect(model.getPopulationWindowSize()).toBe(5); // Clamped to min
    });

    test("should set and get population tolerance with clamping", () => {
      model.setPopulationTolerance(0.25);
      expect(model.getPopulationTolerance()).toBe(0.25);

      // Test clamping
      model.setPopulationTolerance(2.0);
      expect(model.getPopulationTolerance()).toBe(1.0); // Clamped to max

      model.setPopulationTolerance(0.001);
      expect(model.getPopulationTolerance()).toBe(0.01); // Clamped to min
    });
  });

  describe("state serialization exclusion", () => {
    test("should exclude UI state from export", () => {
      // Set up UI state
      model.openDialog("help");
      model.setUIState("showChart", true);
      model.setMaxFPS(90);
      model.setCaptureData({ cells: [], width: 1, height: 1 });

      // Add some game state for comparison
      model.setCellAlive(1, 1, true);
      model.generation = 5;

      const exportedState = model.exportState();

      // Should include game state
      expect(exportedState.generation).toBe(5);
      expect(exportedState.liveCells).toHaveLength(1);

      // Should exclude UI state
      expect(exportedState.uiState).toBeUndefined();
      expect(exportedState.helpOpen).toBeUndefined();
      expect(exportedState.showChart).toBeUndefined();
      expect(exportedState.maxFPS).toBeUndefined();
      expect(exportedState.captureData).toBeUndefined();
    });
  });

  describe("integration with existing functionality", () => {
    test("should work alongside game state operations", () => {
      // Set up game state
      model.setCellAlive(5, 5, true);
      model.setRunning(true);

      // Set up UI state
      model.openDialog("about");
      model.setUIState("showChart", true);
      model.setMaxFPS(75);

      // Verify all state is maintained
      expect(model.isCellAlive(5, 5)).toBe(true);
      expect(model.getIsRunning()).toBe(true);
      expect(model.isDialogOpen("about")).toBe(true);
      expect(model.getUIState("showChart")).toBe(true);
      expect(model.getMaxFPS()).toBe(75);
    });

    test("should maintain UI state during game operations", () => {
      model.openDialog("options");
      model.setUIState("showSpeedGauge", false);
      model.setMaxGPS(45);

      // Perform game operations
      model.setCellAlive(0, 0, true);
      model.step();
      model.clear();

      // UI state should be preserved
      expect(model.isDialogOpen("options")).toBe(true);
      expect(model.getUIState("showSpeedGauge")).toBe(false);
      expect(model.getMaxGPS()).toBe(45);
    });

    test("should support multiple observers for UI events", () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      model.addObserver(observer1);
      model.addObserver(observer2);

      model.openDialog("palette");

      expect(observer1).toHaveBeenCalledWith(
        "uiStateChanged",
        expect.any(Object),
      );
      expect(observer2).toHaveBeenCalledWith(
        "uiStateChanged",
        expect.any(Object),
      );
    });
  });
});
