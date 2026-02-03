import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimpleScriptPanel from '../SimpleScriptPanel.js';
import { parseBlocks, execBlock } from '../scriptingInterpreter.js';

jest.mock('../../auth/AuthProvider.js', () => ({
  useAuth: () => ({ token: null })
}));

jest.mock('../scriptingInterpreter.js', () => ({
  parseBlocks: jest.fn(),
  execBlock: jest.fn()
}));

describe('SimpleScriptPanel run flow', () => {
  beforeEach(() => {
    jest.spyOn(globalThis, 'dispatchEvent');
    parseBlocks.mockReset();
    execBlock.mockReset();
    parseBlocks.mockImplementation((lines) => lines);
    execBlock.mockImplementation(async (blocks, state, onStep) => {
      state.cells = new Set();
      onStep(state.cells);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('stops simulation and clears grid when opened', async () => {
    const setIsRunning = jest.fn();
    const clearSpy = jest.fn();
    const handler = () => clearSpy();
    globalThis.addEventListener('gol:script:clearGrid', handler);

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={true} setIsRunning={setIsRunning} />);

    await waitFor(() => expect(setIsRunning).toHaveBeenCalledWith(false));
    await waitFor(() => expect(clearSpy).toHaveBeenCalled());

    globalThis.removeEventListener('gol:script:clearGrid', handler);
  });

  test('runs script content, emits events, and autosaves locally when logged out', async () => {
    const startListener = jest.fn();
    const endListener = jest.fn();
    globalThis.addEventListener('gol:script:start', startListener);
    globalThis.addEventListener('gol:script:end', endListener);
    const setItemSpy = jest.spyOn(globalThis.localStorage.__proto__, 'setItem');

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={false} setIsRunning={() => {}} />);

    fireEvent.click(screen.getByText(/Run Script/i));

    await waitFor(() => expect(startListener).toHaveBeenCalled());
    await waitFor(() => expect(endListener).toHaveBeenCalled());
    expect(setItemSpy).toHaveBeenCalledWith('gol_script_autosave', expect.any(String));

    globalThis.removeEventListener('gol:script:start', startListener);
    globalThis.removeEventListener('gol:script:end', endListener);
    setItemSpy.mockRestore();
  });

  test('cancel dispatches stop event while running', async () => {
    const stopListener = jest.fn();
    globalThis.addEventListener('gol:script:stop', stopListener);

    execBlock.mockImplementation(async (blocks, state, onStep, _a, _b, _c, _d, _e, shouldCancel) => {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldCancel && shouldCancel()) {
            reject(new Error('cancelled'));
          } else {
            resolve();
          }
        }, 0);
      });
      state.cells = new Set();
      onStep(state.cells);
    });

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={false} setIsRunning={() => {}} />);

    fireEvent.click(screen.getByText(/Run Script/i));
    fireEvent.click(screen.getByText(/Cancel Script/i));

    await waitFor(() => expect(stopListener).toHaveBeenCalled());
    globalThis.removeEventListener('gol:script:stop', stopListener);
  });

  test('clicking Run closes the dialog immediately', async () => {
    const onClose = jest.fn();
    execBlock.mockResolvedValue(undefined);
    render(<SimpleScriptPanel open onClose={onClose} isRunning={false} setIsRunning={() => {}} />);

    fireEvent.click(screen.getByText(/Run Script/i));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test('dispatch order includes clearGrid before start and final step with cells', async () => {
    execBlock.mockImplementation(async (blocks, state) => {
      state.cells = new Set(['1,2']);
    });

    const events = [];
    globalThis.dispatchEvent.mockImplementation((evt) => {
      if (evt?.type?.startsWith('gol:script:')) {
        events.push(evt);
      }
      return true;
    });

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={false} setIsRunning={() => {}} />);
    fireEvent.click(screen.getByText(/Run Script/i));

    await waitFor(() => expect(events.some(e => e.type === 'gol:script:end')).toBe(true));

    const types = events.map(e => e.type);
    const clearIndex = types.indexOf('gol:script:clearGrid');
    const startIndex = types.indexOf('gol:script:start');
    const finalStep = events.filter(e => e.type === 'gol:script:step').pop();

    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeGreaterThan(clearIndex);
    expect(finalStep.detail.cells).toEqual([{ x: 1, y: 2 }]);
  });

  test('lifeStep-derived ticks dispatch empty step for isolated cell', async () => {
    execBlock.mockImplementation(async (_blocks, state, onStep, _a, _b, ticks) => {
      const next = ticks([{ x: 0, y: 0 }]);
      state.cells = next;
      onStep(next);
    });

    const steps = [];
    globalThis.dispatchEvent.mockImplementation((evt) => {
      if (evt?.type === 'gol:script:step') {
        steps.push(evt.detail.cells);
      }
      return true;
    });

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={false} setIsRunning={() => {}} />);
    fireEvent.click(screen.getByText(/Run Script/i));

    await waitFor(() => expect(steps.length).toBeGreaterThan(0));
    expect(steps[steps.length - 1]).toEqual([]);
  });

  test('parse errors surface as alert and skip start event', async () => {
    parseBlocks.mockImplementation(() => { throw new Error('bad parse'); });
    const events = [];
    globalThis.dispatchEvent.mockImplementation((evt) => {
      events.push(evt?.type);
      return true;
    });

    render(<SimpleScriptPanel open onClose={() => {}} isRunning={false} setIsRunning={() => {}} />);
    fireEvent.click(screen.getByText(/Run Script/i));

    expect(await screen.findByText('bad parse')).not.toBeNull();
    expect(events).not.toContain('gol:script:start');
  });
});
