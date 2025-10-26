// GameModel.uiState.test.js - Tests for UI state management in GameModel
import { GameModel } from './GameModel';

const CONST_HELP = 'help';
const CONST_ABOUT = 'about';
const CONST_OPTIONS = 'options';
const CONST_UISTATECHANGED = 'uiStateChanged';
const CONST_SHOWCHART = 'showChart';
const CONST_MAXFPS = 'maxFPS';
const CONST_SHOWSPEEDGAUGE = 'showSpeedGauge';

describe('GameModel UI State Management', () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  describe('dialog state management', () => {
    test('should initialize with all dialogs closed', () => {
      expect(model.isDialogOpen(CONST_HELP)).toBe(false);
      expect(model.isDialogOpen(CONST_ABOUT)).toBe(false);
      expect(model.isDialogOpen(CONST_OPTIONS)).toBe(false);
      expect(model.isDialogOpen('palette')).toBe(false);
      expect(model.isDialogOpen('captureDialog')).toBe(false);
      expect(model.isDialogOpen('saveDialog')).toBe(false);
      expect(model.isDialogOpen('loadDialog')).toBe(false);
    });

    test('should open and close dialogs', () => {
      model.openDialog(CONST_HELP);
      expect(model.isDialogOpen(CONST_HELP)).toBe(true);

      model.closeDialog(CONST_HELP);
      expect(model.isDialogOpen(CONST_HELP)).toBe(false);
    });

    test('should notify observers when opening dialogs', () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.openDialog(CONST_ABOUT);

      expect(observer).toHaveBeenCalledWith(CONST_UISTATECHANGED, {
        type: 'dialogOpen',
        dialog: CONST_ABOUT,
        open: true
      });
    });

    test('should notify observers when closing dialogs', () => {
      model.openDialog(CONST_OPTIONS);
      
      const observer = jest.fn();
      model.addObserver(observer);

      model.closeDialog(CONST_OPTIONS);

      expect(observer).toHaveBeenCalledWith(CONST_UISTATECHANGED, {
        type: 'dialogClose',
        dialog: CONST_OPTIONS,
        open: false
      });
    });

    test('should handle invalid dialog names gracefully', () => {
      expect(() => {
        model.openDialog('invalidDialog');
      }).not.toThrow();

      expect(model.isDialogOpen('invalidDialog')).toBe(false);
    });

    test('should support multiple dialogs open simultaneously', () => {
      model.openDialog(CONST_HELP);
      model.openDialog(CONST_ABOUT);

      expect(model.isDialogOpen(CONST_HELP)).toBe(true);
      expect(model.isDialogOpen(CONST_ABOUT)).toBe(true);
    });
  });

  describe('UI state management', () => {
    test('should set and get UI state values', () => {
  model.setUIStateModel(CONST_SHOWCHART, true);
      expect(model.getUIState(CONST_SHOWCHART)).toBe(true);

  model.setUIStateModel(CONST_MAXFPS, 120);
      expect(model.getUIState(CONST_MAXFPS)).toBe(120);
    });

    test('should notify observers when UI state changes', () => {
      const observer = jest.fn();
      model.addObserver(observer);

  model.setUIStateModel(CONST_SHOWSPEEDGAUGE, false);

      expect(observer).toHaveBeenCalledWith(CONST_UISTATECHANGED, {
        type: 'stateChange',
        key: CONST_SHOWSPEEDGAUGE,
        value: false
      });
    });

    test('should not notify observers when setting same value', () => {
  model.setUIStateModel('popWindowSize', 15);

      const observer = jest.fn();
      model.addObserver(observer);

  model.setUIStateModel('popWindowSize', 15); // Same value

      expect(observer).not.toHaveBeenCalled();
    });

    test('should return all UI state', () => {
  model.setUIStateModel(CONST_SHOWCHART, true);
  model.setUIStateModel(CONST_MAXFPS, 90);

      const allState = model.getAllUIState();

      expect(allState.showChart).toBe(true);
      expect(allState.maxFPS).toBe(90);
      expect(allState.showSpeedGauge).toBe(true); // Default value
    });

    test('should return defensive copy of UI state', () => {
      const state1 = model.getAllUIState();
      const state2 = model.getAllUIState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values

      // Mutating returned state should not affect internal state
      state1.showChart = true;
      expect(model.getUIState(CONST_SHOWCHART)).toBe(false);
    });
  });

  describe('convenience methods', () => {
    test('should toggle chart visibility', () => {
      expect(model.getUIState(CONST_SHOWCHART)).toBe(false);

      model.toggleChart();
      expect(model.getUIState(CONST_SHOWCHART)).toBe(true);

      model.toggleChart();
      expect(model.getUIState(CONST_SHOWCHART)).toBe(false);
    });

    test('should toggle speed gauge visibility', () => {
      expect(model.getUIState(CONST_SHOWSPEEDGAUGE)).toBe(true);

      model.toggleSpeedGauge();
      expect(model.getUIState(CONST_SHOWSPEEDGAUGE)).toBe(false);

      model.toggleSpeedGauge();
      expect(model.getUIState(CONST_SHOWSPEEDGAUGE)).toBe(true);
    });
  });

  describe('capture data management', () => {
    test('should set and get capture data', () => {
      const testData = {
        cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        width: 2,
        height: 2
      };

  model.setCaptureDataModel(testData);
      expect(model.getCaptureData()).toBe(testData);
    });

    test('should auto-open capture dialog when setting data', () => {
      const observer = jest.fn();
      model.addObserver(observer);

      const testData = { cells: [], width: 1, height: 1 };
  model.setCaptureDataModel(testData);

      expect(model.isDialogOpen('captureDialog')).toBe(true);
      expect(observer).toHaveBeenCalledWith(CONST_UISTATECHANGED, {
        type: 'captureDataChanged',
        data: testData
      });
    });

    test('should handle null capture data', () => {
      const testData = { cells: [], width: 1, height: 1 };
  model.setCaptureDataModel(testData);

  model.setCaptureDataModel(null);
      expect(model.getCaptureData()).toBe(null);
    });
  });

  describe('performance settings', () => {
    test('should set and get max FPS with clamping', () => {
  model.setMaxFPSModel(120);
      expect(model.getMaxFPS()).toBe(120);

      // Test clamping
  model.setMaxFPSModel(300);
      expect(model.getMaxFPS()).toBe(240); // Clamped to max

  model.setMaxFPSModel(0);
      expect(model.getMaxFPS()).toBe(1); // Clamped to min
    });

    test('should set and get max GPS with clamping', () => {
      model.setMaxGPS(45);
      expect(model.getMaxGPS()).toBe(45);

      // Test clamping
      model.setMaxGPS(150);
      expect(model.getMaxGPS()).toBe(120); // Clamped to max

      model.setMaxGPS(-5);
      expect(model.getMaxGPS()).toBe(1); // Clamped to min
    });
  });

  describe('population stability settings', () => {
    test('should set and get population window size with clamping', () => {
  model.setPopulationWindowSizeModel(25);
      expect(model.getPopulationWindowSize()).toBe(25);

      // Test clamping
  model.setPopulationWindowSizeModel(150);
      expect(model.getPopulationWindowSize()).toBe(100); // Clamped to max

  model.setPopulationWindowSizeModel(2);
      expect(model.getPopulationWindowSize()).toBe(5); // Clamped to min
    });

    test('should set and get population tolerance with clamping', () => {
  model.setPopulationToleranceModel(0.25);
      expect(model.getPopulationTolerance()).toBe(0.25);

      // Test clamping
  model.setPopulationToleranceModel(2);
      expect(model.getPopulationTolerance()).toBe(1); // Clamped to max

  model.setPopulationToleranceModel(0.001);
      expect(model.getPopulationTolerance()).toBe(0.01); // Clamped to min
    });
  });

  describe('state serialization exclusion', () => {
    test('should exclude UI state from export', () => {
      // Set up UI state
      model.openDialog(CONST_HELP);
  model.setUIStateModel(CONST_SHOWCHART, true);
  model.setMaxFPSModel(90);
  model.setCaptureDataModel({ cells: [], width: 1, height: 1 });

      // Add some game state for comparison
  model.setCellAliveModel(1, 1, true);
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

  describe('integration with existing functionality', () => {
    test('should work alongside game state operations', () => {
      // Set up game state
  model.setCellAliveModel(5, 5, true);
  model.setRunningModel(true);

      // Set up UI state
      model.openDialog(CONST_ABOUT);
  model.setUIStateModel(CONST_SHOWCHART, true);
  model.setMaxFPSModel(75);

      // Verify all state is maintained
      expect(model.isCellAlive(5, 5)).toBe(true);
      expect(model.getIsRunning()).toBe(true);
      expect(model.isDialogOpen(CONST_ABOUT)).toBe(true);
      expect(model.getUIState(CONST_SHOWCHART)).toBe(true);
      expect(model.getMaxFPS()).toBe(75);
    });

    test('should maintain UI state during game operations', () => {
      model.openDialog(CONST_OPTIONS);
  model.setUIStateModel(CONST_SHOWSPEEDGAUGE, false);
      model.setMaxGPS(45);

      // Perform game operations
  model.setCellAliveModel(0, 0, true);
      model.step();
  model.clearModel();

      // UI state should be preserved
      expect(model.isDialogOpen(CONST_OPTIONS)).toBe(true);
      expect(model.getUIState(CONST_SHOWSPEEDGAUGE)).toBe(false);
      expect(model.getMaxGPS()).toBe(45);
    });

    test('should support multiple observers for UI events', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      model.addObserver(observer1);
      model.addObserver(observer2);

      model.openDialog('palette');

      expect(observer1).toHaveBeenCalledWith(CONST_UISTATECHANGED, expect.any(Object));
      expect(observer2).toHaveBeenCalledWith(CONST_UISTATECHANGED, expect.any(Object));
    });
  });
});