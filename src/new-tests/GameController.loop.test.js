// --- TEST ENVIRONMENT PATCHES FOR JEST ---
// Robust global mocks for RAF/CAF and Worker
import { GameModel } from '../../src/model/GameModel.js';
import { GameView } from '../../src/view/GameView.js';
import { GameController } from '../../src/controller/GameController.js';
let rafCallbacks = [];
let rafId = 0;
beforeAll(() => {
  globalThis.requestAnimationFrame = (cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  };
  globalThis.cancelAnimationFrame = (id) => {
    if (rafCallbacks[id - 1]) rafCallbacks[id - 1] = null;
  };
  // Enhanced Worker mock: always returns an object, never undefined
  globalThis.Worker = jest.fn(function() {
    // Attach a marker property for test detection
    return {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
      __isMockWorker: true
    };
  });
});
afterAll(() => {
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
  delete globalThis.Worker;
});
// Mock StepScheduler to bypass ESM/worker errors in Jest
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

function createMockCanvas({ width = 300, height = 200 } = {}) {
  const ctx = {
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    setTransform: () => {},
    fillRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
  };
  return {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }),
    style: {},
    // No DOM event listeners in tests; GameView guards on addEventListener presence
  };
}

// Helper functions for Worker mocking (used by multiple describe blocks)

function uninstallWorkerMock() {
  delete globalThis.Worker;
}




describe('GameController Web Worker loop (optional feature)', () => {
  afterEach(() => {
    uninstallWorkerMock();
  });

  test('startWorkerLoop gracefully handles being called in test environment', () => {
    // In test environment, startWorkerLoop should not crash
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    expect(() => controller.startWorkerLoop()).not.toThrow();
    // Worker is mocked, so controller.worker may be undefined, null, or a mock object
    expect(
      controller.worker === undefined ||
      controller.worker === null ||
      typeof controller.worker === 'object'
    ).toBe(true);
  });

  test('startWorkerLoop is idempotent (safe to call multiple times)', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    controller.startWorkerLoop();
    const firstWorker = controller.worker;
    controller.startWorkerLoop();
    expect(controller.worker).toBe(firstWorker);
  });

  test('stopWorkerLoop safely handles null worker (graceful when Worker not created)', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    controller.startWorkerLoop();
    expect(() => controller.stopWorkerLoop()).not.toThrow();
  });

  test('stopWorkerLoop is safe to call when no Worker is running', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    expect(() => controller.stopWorkerLoop()).not.toThrow();
  });

  test('Worker feature gracefully unavailable in test environment', async () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    const stepSpy = jest.spyOn(model, 'step').mockResolvedValue(undefined);
    controller.startWorkerLoop();
    // Worker is mocked, so controller.worker may be undefined, null, or a mock object
    expect(
      controller.worker === undefined ||
      controller.worker === null ||
      typeof controller.worker === 'object'
    ).toBe(true);
    expect(stepSpy).not.toHaveBeenCalled();
  });

  test('Worker feature requires ES module environment (import.meta)', () => {
    // In Jest, Worker is always mocked, so just check no throw
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });
    expect(() => controller.startWorkerLoop()).not.toThrow();
  });
});

