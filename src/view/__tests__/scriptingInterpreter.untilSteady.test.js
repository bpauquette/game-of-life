import { execBlock } from '../scriptingInterpreter.js';

describe('scriptingInterpreter UNTIL_STEADY', () => {
  test('emits onStep each iteration and records stability steps', async () => {
    const blocks = [
      { line: 'UNTIL_STEADY result 5', indent: 0, raw: 'UNTIL_STEADY result 5', idx: 0 }
    ];

    const state = {
      cells: new Set(['0,0']),
      vars: {},
      outputLabels: []
    };

    // Toggle between two states to reach stability in 2 steps (periodic)
    let toggle = false;
    const ticks = jest.fn().mockImplementation(() => {
      toggle = !toggle;
      return toggle
        ? new Map([['1,0', true]])
        : new Map([['0,0', true]]);
    });

    const onStep = jest.fn();

    await execBlock(blocks, state, onStep, null, null, ticks);

    expect(onStep).toHaveBeenCalledTimes(3); // two iterations plus final steady-state emit

    const [firstCall, secondCall, finalCall] = onStep.mock.calls.map(([cells]) => cells);
    expect(firstCall.has('1,0')).toBe(true);
    expect(secondCall.has('0,0')).toBe(true);
    expect(finalCall.has('0,0')).toBe(true);

    expect(state.vars.result).toBe(2); // steps taken to detect steady oscillation
    expect(state.vars.result_period).toBeGreaterThanOrEqual(1);
  });
});
