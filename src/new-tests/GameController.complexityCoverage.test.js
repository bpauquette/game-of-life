import { GameController } from '../controller/GameController.js';

jest.mock('../controller/StepScheduler', () => ({
  __esModule: true,
  default: function StepScheduler() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      setCaps: jest.fn(),
      setUseWorker: jest.fn(),
      animationId: null,
      worker: null
    };
  }
}));

function createHarness({ selectedTool = 'draw', running = false, selectedShape = null } = {}) {
  let tool = selectedTool;
  let isRunning = running;
  let shape = selectedShape;
  let viewport = { offsetX: 0, offsetY: 0, cellSize: 8, zoom: 1 };

  const model = {
    addObserver: jest.fn(),
    removeObserver: jest.fn(),
    notifyObservers: jest.fn(),
    getSelectedTool: jest.fn(() => tool),
    setSelectedToolModel: jest.fn((next) => { tool = next; }),
    getSelectedShape: jest.fn(() => shape),
    setSelectedShapeModel: jest.fn((next) => { shape = next; }),
    setOverlay: jest.fn(),
    getOverlay: jest.fn(() => null),
    setCursorPositionModel: jest.fn(),
    getCursorPosition: jest.fn(() => null),
    getViewport: jest.fn(() => viewport),
    setViewportModel: jest.fn((offsetX, offsetY, cellSize = 8, zoom = 1) => {
      viewport = { offsetX, offsetY, cellSize, zoom };
    }),
    getLiveCells: jest.fn(() => []),
    getIsRunning: jest.fn(() => isRunning),
    setRunningModel: jest.fn((next) => { isRunning = !!next; }),
    isCellAlive: jest.fn(() => false),
    setCellAliveModel: jest.fn(),
    placeShape: jest.fn(),
    step: jest.fn()
  };

  const handlers = {};
  const view = {
    on: jest.fn((evt, cb) => { handlers[evt] = cb; }),
    render: jest.fn(),
    destroy: jest.fn(),
    renderer: {
      viewport: { cellSize: 8 },
      setViewport: jest.fn()
    }
  };

  const controller = new GameController(model, view, {});
  return { controller, model, view };
}

describe('GameController complexity helper coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handleMouseDown ignores non-left clicks', () => {
    const { controller } = createHarness({ selectedTool: 'draw' });
    const drawTool = { onMouseDown: jest.fn() };
    controller.registerTool('draw', drawTool);

    controller.handleMouseDown({ x: 1, y: 2 }, { button: 2 });

    expect(controller.mouseState.button).toBe(2);
    expect(drawTool.onMouseDown).not.toHaveBeenCalled();
  });

  test('handleMouseDown ignores duplicate dispatches until mouseup resets state', () => {
    const { controller } = createHarness({ selectedTool: 'toggle' });
    const toggleTool = { onMouseDown: jest.fn(), onMouseMove: jest.fn(), onMouseUp: jest.fn() };
    controller.registerTool('toggle', toggleTool);

    controller.handleMouseDown({ x: 4, y: 4 }, { button: 0 });
    // Simulate the second dispatch from the React canvas handler path.
    controller.handleMouseDown({ x: 4, y: 4 });
    expect(toggleTool.onMouseDown).toHaveBeenCalledTimes(1);

    controller.handleMouseUp({ x: 4, y: 4 });
    controller.handleMouseDown({ x: 4, y: 4 }, { button: 0 });
    expect(toggleTool.onMouseDown).toHaveBeenCalledTimes(2);
  });

  test('shift+left drag pans viewport and does not invoke tool handlers', () => {
    const { controller, model } = createHarness({ selectedTool: 'draw' });
    const drawTool = { onMouseDown: jest.fn(), onMouseMove: jest.fn(), onMouseUp: jest.fn() };
    controller.registerTool('draw', drawTool);

    controller.handleMouseDown({ x: 4, y: 4 }, { button: 0, shiftKey: true, clientX: 100, clientY: 120 });
    controller.handleMouseMove({ x: 4, y: 4 }, { clientX: 140, clientY: 152 });
    controller.handleMouseUp({ x: 4, y: 4 });

    expect(drawTool.onMouseDown).not.toHaveBeenCalled();
    expect(drawTool.onMouseMove).not.toHaveBeenCalled();
    expect(drawTool.onMouseUp).not.toHaveBeenCalled();
    expect(model.setViewportModel).toHaveBeenCalled();
    const lastCall = model.setViewportModel.mock.calls[model.setViewportModel.mock.calls.length - 1];
    expect(lastCall[0]).toBeCloseTo(-5, 4);
    expect(lastCall[1]).toBeCloseTo(-4, 4);
    expect(controller.panState.isPanning).toBe(false);
  });

  test('handleMouseDown blocks drawing while running when preference is off', () => {
    const { controller } = createHarness({ selectedTool: 'draw', running: true });
    const drawTool = { onMouseDown: jest.fn() };
    controller.registerTool('draw', drawTool);
    jest.spyOn(controller, '_getDrawWhileRunning').mockReturnValue(false);

    controller.handleMouseDown({ x: 3, y: 4 }, { button: 0 });

    expect(drawTool.onMouseDown).not.toHaveBeenCalled();
  });

  test('handleMouseDown for shapes stores precise point and selected shape', () => {
    const selectedShape = { id: 'shape-1', cells: [[0, 0]] };
    const { controller } = createHarness({ selectedTool: 'shapes', selectedShape });
    const shapeTool = { onMouseDown: jest.fn() };
    controller.registerTool('shapes', shapeTool);

    controller.handleMouseDown({ x: 5, y: 6, fx: 5.25, fy: 6.5 }, { button: 0 });

    expect(shapeTool.onMouseDown).toHaveBeenCalledWith(
      expect.any(Object),
      5,
      6,
      expect.any(Function),
      expect.any(Function)
    );
    expect(controller.toolState.start).toMatchObject({ x: 5, y: 6, fx: 5.25, fy: 6.5 });
    expect(controller.toolState.selectedShapeData).toEqual(selectedShape);
  });

  test('undo diff collector records only changed cells', () => {
    const { controller, model } = createHarness();
    controller._currentDiff = [];
    model.isCellAlive.mockImplementationOnce(() => false).mockImplementationOnce(() => true);

    controller._initializeUndoDiffCollector();
    controller._setCellAliveForUndo(1, 1, true);
    controller._setCellAliveForUndo(2, 2, true);

    expect(controller._currentDiff).toHaveLength(1);
    expect(controller._currentDiff[0]).toMatchObject({ x: 1, y: 1, prevAlive: false, newAlive: true });
    expect(model.setCellAliveModel).toHaveBeenCalledTimes(2);
  });

  test('shape placement helper computes diff and appends to current diff', () => {
    const shape = { cells: [{ x: 0, y: 0 }, [1, 0], [2, 0]] };
    const { controller, model } = createHarness({ selectedShape: shape });
    model.isCellAlive.mockImplementation((x) => x === 11);

    controller._currentDiff = null;
    controller._placeSelectedShapeWithUndo(10, 20);

    expect(model.placeShape).toHaveBeenCalledWith(10, 20, shape);
    expect(controller._currentDiff).toHaveLength(2);
    expect(controller._currentDiff.map((c) => `${c.x},${c.y}`)).toEqual(expect.arrayContaining(['10,20', '12,20']));
    expect(controller._lastPlacementAt).toBeGreaterThan(0);
  });

  test('appendCurrentDiff ignores empty inputs', () => {
    const { controller } = createHarness();
    controller._currentDiff = [{ x: 0, y: 0, prevAlive: false, newAlive: true }];

    controller._appendCurrentDiff([]);
    controller._appendCurrentDiff(null);

    expect(controller._currentDiff).toHaveLength(1);
  });

  test('applyPerformanceSettings updates caps and syncs scheduler', () => {
    const { controller } = createHarness();
    controller.scheduler = { setCaps: jest.fn(), setUseWorker: jest.fn() };

    controller.applyPerformanceSettings({
      maxFPS: 120,
      maxGPS: 60,
      enableFPSCap: true,
      enableGPSCap: true,
      useWebWorker: true
    });

    expect(controller.performanceCaps.maxFPS).toBe(120);
    expect(controller.performanceCaps.maxGPS).toBe(60);
    expect(controller.performanceCaps.enableFPSCap).toBe(true);
    expect(controller.performanceCaps.enableGPSCap).toBe(true);
    expect(controller.scheduler.setUseWorker).toHaveBeenCalledWith(true);
    expect(controller.scheduler.setCaps).toHaveBeenCalledTimes(1);
  });

  test('applyPerformanceSettings is a no-op for invalid or unchanged payloads', () => {
    const { controller } = createHarness();
    controller.scheduler = { setCaps: jest.fn(), setUseWorker: jest.fn() };

    controller.applyPerformanceSettings(null);
    controller.applyPerformanceSettings({});
    controller.applyPerformanceSettings({ useWebWorker: false });

    expect(controller.scheduler.setCaps).not.toHaveBeenCalled();
    expect(controller.scheduler.setUseWorker).not.toHaveBeenCalled();
  });
});
