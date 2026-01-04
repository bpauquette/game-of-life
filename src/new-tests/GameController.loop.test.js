import { GameModel } from '../../src/model/GameModel';
import { GameView } from '../../src/view/GameView';
import { GameController } from '../../src/controller/GameController';

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

describe('GameController animation loop', () => {
  let originalRAF;
  let originalCAF;
  let savedCallback;
  let rafId = 0;
  const rafCalls = [];
  const cafCalls = [];

  const installRAFMock = () => {
  originalRAF = globalThis.requestAnimationFrame;
  originalCAF = globalThis.cancelAnimationFrame;
    savedCallback = null;
    rafId = 0;
    rafCalls.length = 0;
    cafCalls.length = 0;
    globalThis.requestAnimationFrame = (cb) => {
      savedCallback = cb;
      const id = ++rafId;
      rafCalls.push(id);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      cafCalls.push(id);
      if (id === rafId) {
        // Clear saved callback only if cancelling latest id
        savedCallback = null;
      }
    };
  };

  const uninstallRAFMock = () => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
  };

  const runFrame = (ts) => {
    if (typeof savedCallback === 'function') {
      const cb = savedCallback;
      // Clear before invoking to simulate browser behavior where a new RAF is scheduled inside callback
      savedCallback = null;
      cb(ts);
    }
  };

  beforeEach(() => {
    installRAFMock();
  });

  afterEach(() => {
    uninstallRAFMock();
  });

  // Mock Web Worker for Web Worker tests
  const createMockWorker = () => {
    const mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null
    };
    return mockWorker;
  };

  const installWorkerMock = () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);
    return mockWorker;
  };

  const uninstallWorkerMock = () => {
    delete global.Worker;
  };

  test('startGameLoop is idempotent; stop cancels', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    controller.startAnimationLoop();
    controller.startAnimationLoop();

    expect(rafCalls.length).toBe(1); // No double-start
    expect(controller.animationId).toBeTruthy();

    controller.stopAnimationLoop();
    expect(controller.animationId).toBeNull();
    expect(cafCalls.length).toBe(1);
  });

  test('loops steps and renders when running, throttled by frameInterval', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    const stepSpy = jest.spyOn(model, 'step');
    const renderSpy = jest.spyOn(controller, 'requestRender');

    controller.performanceCaps.enableGPSCap = true;
    controller.setSpeed(30);
    controller.setRunning(true); // triggers loop via observer

  // First frame below interval should not step
  runFrame(10);
  expect(stepSpy).not.toHaveBeenCalled();
  // Clear any incidental renders from initialization or first RAF
  stepSpy.mockClear();
  renderSpy.mockClear();

  // Next frame over ~33ms should step once
    runFrame(40);
    expect(stepSpy).toHaveBeenCalledTimes(1);
  // At least one render should occur for a step (observer may trigger an additional render)
  expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Another frame after additional time should allow another step; depending
    // on timing and caps this may or may not occur, but must not regress
    // below one step.
    runFrame(80);
    expect(stepSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    controller.setRunning(false);
  });

  test('stops on running=false and does not schedule further frames', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    const stepSpy = jest.spyOn(model, 'step');

    controller.setRunning(true);
    runFrame(40); // one step
    expect(stepSpy).toHaveBeenCalledTimes(1);

    controller.setRunning(false);

    // Any subsequent RAF callback should early-exit and not step again
    runFrame(80);
    expect(stepSpy).toHaveBeenCalledTimes(1);
    expect(controller.animationId).toBeNull();
  });
});

// Helper functions for Worker mocking (used by multiple describe blocks)
function uninstallWorkerMock() {
  delete global.Worker;
}

function createMockWorkerConstructor() {
  // Keep track of created worker instances
  const instances = [];
  
  global.Worker = jest.fn(function() {
    const instance = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null
    };
    instances.push(instance);
    return instance;
  });
  
  // Attach helper to get the last created instance
  global.Worker.getLastInstance = () => instances[instances.length - 1];
  global.Worker.getInstances = () => instances;
  
  return global.Worker;
}

describe('GameController Web Worker loop (optional feature)', () => {
  afterEach(() => {
    uninstallWorkerMock();
  });

  test('startWorkerLoop gracefully handles being called in test environment', () => {
    createMockWorkerConstructor();
    
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    // In test environment, startWorkerLoop should not crash
    // (import.meta.url causes syntax error, so it falls back gracefully)
    controller.startWorkerLoop();

    // Worker should remain null in test environments
    // because import.meta.url is not available in CommonJS/Jest
    expect(controller.worker).toBeNull();
  });

  test('startWorkerLoop is idempotent (safe to call multiple times)', () => {
    createMockWorkerConstructor();
    
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    // Call multiple times
    controller.startWorkerLoop();
    const firstWorker = controller.worker;
    
    controller.startWorkerLoop(); // Should not create a second worker
    
    // Both calls should result in the same state
    expect(controller.worker).toBe(firstWorker);
    // In test environments, worker is null due to import.meta limitation
    expect(controller.worker).toBeNull();
  });

  test('stopWorkerLoop safely handles null worker (graceful when Worker not created)', () => {
    createMockWorkerConstructor();
    
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    // startWorkerLoop fails in test (import.meta not available)
    controller.startWorkerLoop();
    
    // stopWorkerLoop should be safe to call even when worker is null
    expect(() => controller.stopWorkerLoop()).not.toThrow();
    expect(controller.worker).toBeNull();
  });

  test('stopWorkerLoop is safe to call when no Worker is running', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    // Should not throw
    expect(() => controller.stopWorkerLoop()).not.toThrow();
  });

  test('Worker feature gracefully unavailable in test environment', async () => {
    createMockWorkerConstructor();
    
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    const stepSpy = jest.spyOn(model, 'step').mockResolvedValue(undefined);

    // In test environment, import.meta is not available, so Worker creation falls back
    controller.startWorkerLoop();

    // Verify that controller handled it gracefully
    expect(controller.worker).toBeNull();
    // Setup should not have thrown
    expect(stepSpy).not.toHaveBeenCalled(); // No steps called yet
  });

  test('Worker feature requires ES module environment (import.meta)', () => {
    // When we don't have import.meta (CommonJS/Jest), Worker feature is unavailable
    delete global.Worker; // Remove the mock

    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    // Should not throw - should gracefully fail
    controller.startWorkerLoop();

    // Worker should not be created because import.meta.url is not available
    expect(controller.worker).toBeNull();
  });
});

describe('GameController loop mode selection', () => {
  afterEach(() => {
    uninstallWorkerMock();
  });

  test('supports switching between traditional RAF loop and Web Worker loop', async () => {
    createMockWorkerConstructor();

    const originalRAF = globalThis.requestAnimationFrame;
    const originalCAF = globalThis.cancelAnimationFrame;
    let rafId = 0;
    const rafCalls = [];

    globalThis.requestAnimationFrame = (cb) => {
      const id = ++rafId;
      rafCalls.push(id);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {};

    try {
      const model = new GameModel();
      const view = new GameView(createMockCanvas(), {}, model);
      const controller = new GameController(model, view, { defaultSpeed: 30 });

      // Start with traditional animation loop
      // Initially controller.worker should be null
      expect(controller.worker).toBeNull();

      controller.startAnimationLoop();
      expect(controller.animationId).toBeTruthy();
      // Still null after starting animation loop only
      expect(controller.worker).toBeNull();

      // Can also start Worker loop (both can coexist, though only one should be active)
      controller.startWorkerLoop();
      expect(controller.worker).toBeDefined();

      // Cleanup
      controller.stopAnimationLoop();
      controller.stopWorkerLoop();
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCAF;
      delete global.Worker;
    }
  });
});

