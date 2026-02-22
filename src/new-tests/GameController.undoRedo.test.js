// Mock StepScheduler to bypass ESM/worker errors in Jest
import { GameController } from '../controller/GameController.js';
import { GameModel } from '../model/GameModel.js';
jest.mock('../controller/StepScheduler', () => ({
  __esModule: true,
  default: function StepScheduler() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      setSpeed: jest.fn(),
      setUseWorker: jest.fn(),
      isUsingWorker: () => false,
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
    };
  }
}));

describe('GameController undo/redo', () => {
  let model, controller;
  const { drawTool } = require('../controller/tools/drawTool.js');
  // Helper to create a setCellAlive wrapper that records diffs before mutating model
  const makeSetCellAliveForUndo = (m, c) => (x, y, alive) => {
    const prevAlive = m.isCellAlive(x, y);
    if (prevAlive !== alive) {
      c._currentDiff.push({ x, y, prevAlive, newAlive: alive });
    }
    m.setCellAliveModel(x, y, alive);
  };
  beforeEach(() => {
    model = new GameModel();
    controller = new GameController(model, { on: () => {} });
    controller.registerTool('draw', drawTool);
    controller.setSelectedTool('draw');
    // Reset tool state for each test
    controller.toolState = {};
    if (!globalThis.localStorage) {
      let store = {};
      globalThis.localStorage = {
        getItem: key => store[key],
        setItem: (key, value) => { store[key] = value; },
        removeItem: key => { delete store[key]; }
      };
    }
  });

  it('undo/redo single cell draw', () => {
    // Simulate drawing one cell
    // Directly invoke drawTool logic and controller diff tracking
    controller._currentDiff = [];
    // Slightly different implementation for test uniqueness
    controller._setCellAliveForUndo = makeSetCellAliveForUndo(model, controller);
    // Initialize toolState for drawTool
  controller.toolState = { start: { x: 1, y: 2 }, last: { x: 1, y: 2 }, setCellAlive: controller._setCellAliveForUndo };
  drawTool.onMouseDown(controller.toolState, 1, 2, controller._setCellAliveForUndo);
  drawTool.onMouseUp(controller.toolState);
    controller.recordDiff(controller._currentDiff);
    controller._currentDiff = null;
    controller._setCellAliveForUndo = null;
    expect(model.isCellAlive(1, 2)).toBe(true);
    controller.undo();
    expect(model.isCellAlive(1, 2)).toBe(false);
    controller.redo();
    expect(model.isCellAlive(1, 2)).toBe(true);
  });

  it('undo/redo multi-cell draw stroke', () => {
    // Simulate drawing a line from (1,2) to (1,5)
    controller._currentDiff = [];
    controller._setCellAliveForUndo = makeSetCellAliveForUndo(model, controller);
    // Initialize toolState for drawTool
    controller.toolState = { start: { x: 1, y: 2 }, last: { x: 1, y: 2 } };
    drawTool.onMouseDown(controller.toolState, 1, 2, controller._setCellAliveForUndo);
    for (let y = 2; y <= 5; y++) {
      drawTool.onMouseMove(controller.toolState, 1, y, controller._setCellAliveForUndo, model.isCellAlive.bind(model));
      controller.toolState.last = { x: 1, y };
    }
    drawTool.onMouseUp(controller.toolState);
    controller.recordDiff(controller._currentDiff);
    controller._currentDiff = null;
    controller._setCellAliveForUndo = null;
    for (let y = 2; y <= 5; y++) {
      expect(model.isCellAlive(1, y)).toBe(true);
    }
    controller.undo();
    for (let y = 2; y <= 5; y++) {
      expect(model.isCellAlive(1, y)).toBe(false);
    }
    controller.redo();
    for (let y = 2; y <= 5; y++) {
      expect(model.isCellAlive(1, y)).toBe(true);
    }
  });
});
