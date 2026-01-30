import { step, ticks } from './gameLogic.js';

import LiveCellIndex from './liveCellIndex.js';

describe('gameLogic', () => {
  it('step returns a LiveCellIndex', () => {
    const liveCells = new LiveCellIndex();
    liveCells.setCellAlive(1, 1, true);
    liveCells.setCellAlive(2, 2, true);
    const result = step(liveCells);
    expect(result).toBeInstanceOf(LiveCellIndex);
    expect(typeof result.forEachCell).toBe('function');
  });
  it('ticks returns a LiveCellIndex', () => {
    const liveCells = new LiveCellIndex();
    liveCells.setCellAlive(1, 1, true);
    liveCells.setCellAlive(2, 2, true);
    const result = ticks(liveCells, 2);
    expect(result).toBeInstanceOf(LiveCellIndex);
    expect(typeof result.forEachCell).toBe('function');
  });
});
