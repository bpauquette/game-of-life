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

  test('startGameLoop is idempotent; stop cancels', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    controller.startGameLoop();
    controller.startGameLoop();

    expect(rafCalls.length).toBe(1); // No double-start
    expect(controller.animationId).toBeTruthy();

    controller.stopGameLoop();
    expect(controller.animationId).toBeNull();
    expect(cafCalls.length).toBe(1);
  });

  test('loops steps and renders when running, throttled by frameInterval', () => {
    const model = new GameModel();
    const view = new GameView(createMockCanvas(), {}, model);
    const controller = new GameController(model, view, { defaultSpeed: 30 });

    const stepSpy = jest.spyOn(model, 'step');
    const renderSpy = jest.spyOn(controller, 'requestRender');

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

    // Another frame over interval steps again
    runFrame(80);
    expect(stepSpy).toHaveBeenCalledTimes(2);

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
