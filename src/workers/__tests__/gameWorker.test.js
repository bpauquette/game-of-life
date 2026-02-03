import { jest } from '@jest/globals';

describe('gameWorker', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    global.postMessage = jest.fn();
    global.self = global;
    // Require after globals are prepared so the worker hooks up its handler
    require('../gameWorker.js');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('start sends step messages and stop clears interval', () => {
    global.onmessage({ data: { command: 'start' } });
    jest.advanceTimersByTime(40);
    expect(global.postMessage).toHaveBeenCalledWith({ command: 'step' });

    global.postMessage.mockClear();
    global.onmessage({ data: { command: 'stop' } });
    jest.advanceTimersByTime(60);
    expect(global.postMessage).not.toHaveBeenCalled();
  });

  test('set-interval restarts loop with new cadence', () => {
    global.onmessage({ data: { command: 'start' } });
    jest.advanceTimersByTime(40);
    expect(global.postMessage).toHaveBeenCalled();

    global.postMessage.mockClear();
    global.onmessage({ data: { command: 'set-interval', payload: 5 } });
    jest.advanceTimersByTime(6);
    expect(global.postMessage).toHaveBeenCalled();
  });
});
