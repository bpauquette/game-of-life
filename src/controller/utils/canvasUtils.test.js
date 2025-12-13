import { 
  computeComputedOffset, 
  eventToCellFromCanvas, 
  drawLiveCells 
} from './canvasUtils';

describe('canvasUtils', () => {
  it('exports all expected functions', () => {
    expect(typeof computeComputedOffset).toBe('function');
    expect(typeof eventToCellFromCanvas).toBe('function');
    expect(typeof drawLiveCells).toBe('function');
  });

  it('computeComputedOffset returns correct offset', () => {
    const canvas = { getBoundingClientRect: () => ({ width: 200, height: 100 }) };
    const offsetRef = { current: { x: 5, y: 10 } };
    const cellSize = 10;
    const result = computeComputedOffset(canvas, offsetRef, cellSize);
    // centerX = 100, centerY = 50
    expect(result).toEqual({ x: 5 * 10 - 100, y: 10 * 10 - 50 });
  });

  it('computeComputedOffset returns zeroes for missing args', () => {
    expect(computeComputedOffset(null, null, 10)).toEqual({ x: 0, y: 0 });
  });

  it('eventToCellFromCanvas computes cell from event', () => {
    const canvas = { getBoundingClientRect: () => ({ width: 100, height: 100, left: 10, top: 20 }) };
    const offsetRef = { current: { x: 2, y: 3 } };
    const cellSize = 10;
    const e = { clientX: 60, clientY: 70 };
    // centerX = 50, centerY = 50
    // x = 2 + (60-10-50)/10 = 2 + 0 = 2
    // y = 3 + (70-20-50)/10 = 3 + 0 = 3
    expect(eventToCellFromCanvas(e, canvas, offsetRef, cellSize)).toEqual({ x: 2, y: 3 });
  });

  it('eventToCellFromCanvas returns null for missing args', () => {
    expect(eventToCellFromCanvas({}, null, null, 10)).toBeNull();
  });

  it('drawLiveCells draws with forEachCell', () => {
    const ctx = { fillStyle: '', fillRect: jest.fn() };
    const liveMap = { forEachCell: (cb) => { cb(1, 2); cb(3, 4); } };
    const computedOffset = { x: 0, y: 0 };
    const cellSize = 5;
    const colorScheme = { getCellColor: (x, y) => `rgb(${x},${y},0)` };
    drawLiveCells(ctx, liveMap, computedOffset, cellSize, colorScheme);
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillStyle).toBe('rgb(3,4,0)');
  });

  it('drawLiveCells draws with Map entries', () => {
    const ctx = { fillStyle: '', fillRect: jest.fn() };
    const liveMap = new Map([
      ['1,2', true],
      ['3,4', true]
    ]);
    const computedOffset = { x: 0, y: 0 };
    const cellSize = 5;
    const colorScheme = { getCellColor: (x, y) => `rgb(${x},${y},0)` };
    drawLiveCells(ctx, liveMap, computedOffset, cellSize, colorScheme);
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillStyle).toBe('rgb(3,4,0)');
  });

  it('drawLiveCells returns early for missing ctx or liveMap', () => {
    expect(drawLiveCells(null, null, {}, 5, {})).toBeUndefined();
  });
});
