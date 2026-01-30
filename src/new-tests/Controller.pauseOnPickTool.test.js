// Mock StepScheduler to bypass ESM/worker errors in Jest
import { GameController } from '../controller/GameController.js';
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

// Minimal test doubles for model and view
function makeModel({ running = true } = {}) {
  let isRunning = !!running;
  const observers = new Set();
  return {
    observers,
    addObserver(fn) { observers.add(fn); },
    removeObserver(fn) { observers.delete(fn); },
    notifyObservers(event, data) {
      for (const fn of observers) {
        try { fn(event, data); } catch {}
      }
    },
    setOverlay: jest.fn(),
    setSelectedToolModel: jest.fn(),
    setRunningModel: jest.fn((val) => { isRunning = !!val; }),
    getIsRunning: jest.fn(() => isRunning),
    getSelectedTool: jest.fn(() => 'draw'),
    getViewport: jest.fn(() => ({ cellSize: 8 }))
  };
}

function makeView() {
  const handlers = {};
  return {
    on: jest.fn((evt, cb) => { handlers[evt] = cb; }),
    render: jest.fn(),
    destroy: jest.fn(),
    getDebugInfo: jest.fn(() => ({ handlers: Object.keys(handlers) }))
  };
}

function makeTool() {
  return { onMouseDown: jest.fn(), onMouseMove: jest.fn(), onMouseUp: jest.fn() };
}

describe('GameController - pause when pick/capture tool is selected', () => {
  test('selecting capture tool calls setRunningModel(false) when running', () => {
    const model = makeModel({ running: true });
    const view = makeView();
    const controller = new GameController(model, view, {});

    // Register tools: need at least capture to pass the guard
    controller.registerTool('draw', makeTool());
    controller.registerTool('capture', makeTool());

    controller.setSelectedTool('capture');

    expect(model.setSelectedToolModel).toHaveBeenCalledWith('capture');
    expect(model.getIsRunning).toHaveBeenCalled();
    expect(model.setRunningModel).toHaveBeenCalledWith(false);
  });

  test('selecting capture tool does not call pause when already paused', () => {
    const model = makeModel({ running: false });
    const view = makeView();
    const controller = new GameController(model, view, {});

    controller.registerTool('capture', makeTool());

    controller.setSelectedTool('capture');

    expect(model.setSelectedToolModel).toHaveBeenCalledWith('capture');
    expect(model.getIsRunning).toHaveBeenCalled();
    // Should not attempt to set running false again (no new call)
    expect(model.setRunningModel).not.toHaveBeenCalled();
  });
});
