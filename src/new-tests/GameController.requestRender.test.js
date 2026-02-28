import { GameController } from '../controller/GameController.js';

function createModelMock() {
  const observers = new Set();
  return {
    observers,
    addObserver: jest.fn((cb) => observers.add(cb)),
    notifyObservers: jest.fn(),
    getLiveCells: jest.fn(() => new Map()),
    getViewport: jest.fn(() => ({ offsetX: 0, offsetY: 0, cellSize: 8, zoom: 1 })),
    getSelectedTool: jest.fn(() => 'draw'),
    getSelectedShape: jest.fn(() => null),
    getCursorPosition: jest.fn(() => null),
    getIsRunning: jest.fn(() => false),
    setOverlay: jest.fn(),
    setCellAliveModel: jest.fn(),
    isCellAlive: jest.fn(() => false),
    setSelectedToolModel: jest.fn(),
    setSelectedShapeModel: jest.fn(),
    setRunningModel: jest.fn(),
    clear: jest.fn(),
    getGeneration: jest.fn(() => 0),
    getCellCount: jest.fn(() => 0),
    getBounds: jest.fn(() => ({ minX: 0, maxX: 0, minY: 0, maxY: 0 })),
    setViewportModel: jest.fn(),
    setCursorPositionModel: jest.fn(),
    getOverlay: jest.fn(() => null),
    importState: jest.fn(),
    exportState: jest.fn(() => ({})),
    step: jest.fn(async () => {}),
  };
}

function createViewMock() {
  return {
    on: jest.fn(),
    render: jest.fn(),
    destroy: jest.fn(),
    renderer: {
      viewport: { cellSize: 8, width: 800, height: 600 },
      setViewport: jest.fn(),
    },
  };
}

describe('GameController.requestRender', () => {
  let rafCallbacks;
  let addEventListenerSpy;

  beforeEach(() => {
    rafCallbacks = [];
    global.requestAnimationFrame = jest.fn((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    addEventListenerSpy = jest.spyOn(document, 'addEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    addEventListenerSpy?.mockRestore();
    delete global.requestAnimationFrame;
  });

  test('coalesces burst render requests into a single animation frame', () => {
    const model = createModelMock();
    const view = createViewMock();
    const controller = new GameController(model, view);

    controller.requestRender();
    controller.requestRender();
    controller.requestRender();

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(controller.renderScheduled).toBe(true);

    rafCallbacks[0]();

    expect(view.render).toHaveBeenCalledTimes(1);
    expect(controller.renderScheduled).toBe(false);

    controller.requestRender();
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});
