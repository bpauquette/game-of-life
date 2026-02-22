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

function createHarness(initialViewport = { offsetX: 10, offsetY: 20, cellSize: 10, zoom: 1 }) {
  const viewport = { ...initialViewport };
  const model = {
    addObserver: jest.fn(),
    removeObserver: jest.fn(),
    notifyObservers: jest.fn(),
    getSelectedTool: jest.fn(() => 'draw'),
    getSelectedShape: jest.fn(() => null),
    getOverlay: jest.fn(() => null),
    setOverlay: jest.fn(),
    getCursorPosition: jest.fn(() => null),
    getViewport: jest.fn(() => ({ ...viewport })),
    setViewportModel: jest.fn((offsetX, offsetY, cellSize, zoom) => {
      viewport.offsetX = offsetX;
      viewport.offsetY = offsetY;
      if (typeof cellSize === 'number') viewport.cellSize = cellSize;
      if (typeof zoom === 'number') viewport.zoom = zoom;
      return true;
    }),
    setOffsetModel: jest.fn(),
    getLiveCells: jest.fn(() => []),
    getIsRunning: jest.fn(() => false),
    setRunningModel: jest.fn(),
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
      viewport: { width: 800, height: 600, cellSize: viewport.cellSize, offsetX: viewport.offsetX, offsetY: viewport.offsetY },
      setViewport: jest.fn((offsetX, offsetY, cellSize) => {
        view.renderer.viewport.offsetX = offsetX;
        view.renderer.viewport.offsetY = offsetY;
        view.renderer.viewport.cellSize = cellSize;
      })
    }
  };

  const controller = new GameController(model, view, {});
  return { controller, model, view };
}

describe('GameController zoom anchoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('wheel zoom keeps the pointer-anchored world cell fixed', () => {
    const { controller, model, view } = createHarness();
    const screenX = 560;
    const screenY = 420;
    const canvasCenterX = 400;
    const canvasCenterY = 300;
    const currentSize = view.renderer.viewport.cellSize;
    const viewport = model.getViewport();
    const beforeCellX = viewport.offsetX + (screenX - canvasCenterX) / currentSize;
    const beforeCellY = viewport.offsetY + (screenY - canvasCenterY) / currentSize;

    const event = { cancelable: true, preventDefault: jest.fn() };
    controller.handleWheel(-120, event, { screenX, screenY, canvasCenterX, canvasCenterY });

    expect(view.renderer.setViewport).toHaveBeenCalled();
    const [offsetX, offsetY, nextSize] = view.renderer.setViewport.mock.calls.at(-1);
    const afterCellX = offsetX + (screenX - canvasCenterX) / nextSize;
    const afterCellY = offsetY + (screenY - canvasCenterY) / nextSize;

    expect(afterCellX).toBeCloseTo(beforeCellX, 6);
    expect(afterCellY).toBeCloseTo(beforeCellY, 6);
    expect(model.setViewportModel).toHaveBeenCalledWith(offsetX, offsetY, nextSize, viewport.zoom);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('pinch zoom uses pinch center anchoring from screen coordinates', () => {
    const { controller, model, view } = createHarness();
    const screenX = 470;
    const screenY = 250;
    const canvasCenterX = 400;
    const canvasCenterY = 300;
    const currentSize = view.renderer.viewport.cellSize;
    const viewport = model.getViewport();
    const beforeCellX = viewport.offsetX + (screenX - canvasCenterX) / currentSize;
    const beforeCellY = viewport.offsetY + (screenY - canvasCenterY) / currentSize;

    controller.handlePinchZoom(1.8, {
      screenX,
      screenY,
      canvasCenterX,
      canvasCenterY,
      // Deliberately inconsistent so the handler must anchor from screen coords.
      cellX: 99999,
      cellY: -99999
    });

    expect(view.renderer.setViewport).toHaveBeenCalled();
    const [offsetX, offsetY, nextSize] = view.renderer.setViewport.mock.calls.at(-1);
    const afterCellX = offsetX + (screenX - canvasCenterX) / nextSize;
    const afterCellY = offsetY + (screenY - canvasCenterY) / nextSize;

    expect(afterCellX).toBeCloseTo(beforeCellX, 6);
    expect(afterCellY).toBeCloseTo(beforeCellY, 6);
    expect(model.setViewportModel).toHaveBeenCalledWith(offsetX, offsetY, nextSize, viewport.zoom);
    expect(model.setOffsetModel).not.toHaveBeenCalled();
  });
});
