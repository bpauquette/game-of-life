import { execBlock } from '../scriptingInterpreter.js';

describe('scriptingInterpreter UNTIL_STEADY', () => {
  test('emits onStep each iteration and records rich steady metadata', async () => {
    const blocks = [
      { line: 'UNTIL_STEADY result 10', indent: 0, raw: 'UNTIL_STEADY result 10', idx: 0 }
    ];

    const state = {
      cells: new Set(['0,0']),
      vars: {},
      outputLabels: []
    };

    const ticks = jest.fn().mockReturnValue(new Map([['0,0', true]]));
    const onStep = jest.fn();

    await execBlock(blocks, state, onStep, null, null, ticks);

    expect(onStep).toHaveBeenCalledTimes(4); // 3 iterations + final post-command emit

    const [firstCall, secondCall, thirdCall, finalCall] = onStep.mock.calls.map(([cells]) => cells);
    expect(firstCall.has('0,0')).toBe(true);
    expect(secondCall.has('0,0')).toBe(true);
    expect(thirdCall.has('0,0')).toBe(true);
    expect(finalCall.has('0,0')).toBe(true);

    expect(state.vars.result).toBe(3);
    expect(state.vars.result_mode).toBe('still-life');
    expect(state.vars.result_period).toBe(1);
    expect(state.vars.result_dx).toBe(0);
    expect(state.vars.result_dy).toBe(0);
    expect(state.vars.result_confidence).toBeGreaterThanOrEqual(3);
    expect(String(state.vars.result_reason || '')).toContain('exact repeat confirmed');
  });
});
