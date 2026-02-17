import { GameController } from '../controller/GameController.js';
import { GameModel } from '../model/GameModel.js';
import { captureTool } from '../controller/tools/captureTool.js';

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

function makeView() {
  const handlers = {};
  return {
    on: jest.fn((evt, cb) => { handlers[evt] = cb; }),
    emit: (evt, payload = {}) => handlers[evt]?.(payload),
    render: jest.fn(),
    destroy: jest.fn(),
    renderer: {
      viewport: { cellSize: 8 },
      setViewport: jest.fn()
    }
  };
}

describe('GameController capture mouseUp flow', () => {
  test('forwards mouseUp cell coordinates so capture completion callback runs', () => {
    const model = new GameModel();
    const view = makeView();
    const controller = new GameController(model, view, {});
    const onCaptureComplete = jest.fn();

    controller.registerTool('capture', {
      ...captureTool,
      onCaptureComplete
    });
    controller.setSelectedTool('capture');

    view.emit('mouseDown', { cellCoords: { x: 2, y: 3 }, event: { button: 0 } });
    view.emit('mouseUp', { cellCoords: { x: 4, y: 6 }, event: { button: 0 } });

    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    const captureData = onCaptureComplete.mock.calls[0][0];
    expect(captureData.width).toBe(3);
    expect(captureData.height).toBe(4);
    expect(captureData.originalBounds).toEqual({ minX: 2, maxX: 4, minY: 3, maxY: 6 });
  });

  test('falls back to last tracked cell when mouseUp is missing coordinates', () => {
    const model = new GameModel();
    const view = makeView();
    const controller = new GameController(model, view, {});
    const onCaptureComplete = jest.fn();

    controller.registerTool('capture', {
      ...captureTool,
      onCaptureComplete
    });
    controller.setSelectedTool('capture');

    view.emit('mouseDown', { cellCoords: { x: 2, y: 3 }, event: { button: 0 } });
    view.emit('mouseMove', { cellCoords: { x: 4, y: 6 }, event: { button: 0 } });
    view.emit('mouseUp', { cellCoords: null, event: { button: 0 } });

    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    const captureData = onCaptureComplete.mock.calls[0][0];
    expect(captureData.width).toBe(3);
    expect(captureData.height).toBe(4);
    expect(captureData.originalBounds).toEqual({ minX: 2, maxX: 4, minY: 3, maxY: 6 });
  });
});

