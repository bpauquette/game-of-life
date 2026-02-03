import { executeCommand } from '../scriptingInterpreter.js';

describe('scriptingInterpreter commands', () => {
  test('RECT draws cells, pauses simulation, and emits grid updates', async () => {
    const state = { cells: new Set(), x: 0, y: 0 };
    const onStep = jest.fn();
    const emitStepEvent = jest.fn();
    const onLoadGrid = jest.fn();
    const setIsRunning = jest.fn();

    await executeCommand('RECT 2 2', state, onStep, emitStepEvent, null, null, setIsRunning, onLoadGrid);

    expect(setIsRunning).toHaveBeenCalledWith(false);
    expect(state.simulationPausedForDrawing).toBe(true);

    expect(onLoadGrid).toHaveBeenCalledTimes(1);
    const [[cellsArg]] = onLoadGrid.mock.calls;
    expect(cellsArg).toHaveLength(4);
    expect(cellsArg).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ])
    );

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(state.cells.has('0,0')).toBe(true);
    expect(state.cells.has('1,1')).toBe(true);
  });

  test('CLEAR wipes cells and emits grid updates', async () => {
    const state = { cells: new Set(['0,0', '1,0']), simulationPausedForDrawing: false };
    const onStep = jest.fn();
    const emitStepEvent = jest.fn();
    const onLoadGrid = jest.fn();
    const setIsRunning = jest.fn();

    await executeCommand('CLEAR', state, onStep, emitStepEvent, null, null, setIsRunning, onLoadGrid);

    expect(setIsRunning).toHaveBeenCalledWith(false);
    expect(onLoadGrid).toHaveBeenCalledWith([]);
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(emitStepEvent).toHaveBeenCalledTimes(1);
    expect(state.cells.size).toBe(0);
  });
});
