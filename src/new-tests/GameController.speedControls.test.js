import { GameController } from '../controller/GameController.js';

jest.mock('../controller/StepScheduler', () => ({
  __esModule: true,
  default: function StepScheduler() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      setUseWorker: jest.fn(),
      setCaps: jest.fn(),
      destroy: jest.fn(),
      animationId: null,
      worker: null,
    };
  }
}));

function createController(modelOverrides = {}) {
  const model = {
    addObserver: jest.fn(),
    getMaxFPS: jest.fn(() => 60),
    ...modelOverrides
  };
  const view = {
    on: jest.fn(),
    destroy: jest.fn(),
    renderer: {
      setViewport: jest.fn()
    }
  };
  const controller = new GameController(model, view, {});
  return { controller, model };
}

describe('GameController speed controls', () => {
  test('increaseSpeed works without legacy model.getSpeed()', () => {
    const { controller } = createController({
      getMaxFPS: jest.fn(() => 60)
    });
    const setSpeedSpy = jest.spyOn(controller, 'setSpeed').mockImplementation(() => {});

    expect(() => controller.increaseSpeed()).not.toThrow();
    expect(setSpeedSpy).toHaveBeenCalledWith(61);
  });

  test('decreaseSpeed clamps to minimum FPS', () => {
    const { controller } = createController({
      getMaxFPS: jest.fn(() => 1)
    });
    const setSpeedSpy = jest.spyOn(controller, 'setSpeed').mockImplementation(() => {});

    controller.decreaseSpeed();
    expect(setSpeedSpy).toHaveBeenCalledWith(1);
  });

  test('falls back to performance caps when model speed APIs are missing', () => {
    const { controller } = createController({
      getMaxFPS: undefined,
      getSpeed: undefined
    });
    controller.performanceCaps.maxFPS = 42;
    const setSpeedSpy = jest.spyOn(controller, 'setSpeed').mockImplementation(() => {});

    controller.increaseSpeed();
    expect(setSpeedSpy).toHaveBeenCalledWith(43);
  });

  test('setSpeed applies model-sanitized settings when available', () => {
    const { controller, model } = createController({
      setPerformanceSettingsModel: jest.fn(() => ({
        maxFPS: 2,
        maxGPS: 2,
        enableFPSCap: true,
        enableGPSCap: true
      }))
    });
    const applySpy = jest.spyOn(controller, 'applyPerformanceSettings').mockImplementation(() => {});

    controller.setSpeed(120);

    expect(model.setPerformanceSettingsModel).toHaveBeenCalledWith({ maxFPS: 120, enableFPSCap: true });
    expect(applySpy).toHaveBeenCalledWith({
      maxFPS: 2,
      maxGPS: 2,
      enableFPSCap: true,
      enableGPSCap: true
    });
  });
});
