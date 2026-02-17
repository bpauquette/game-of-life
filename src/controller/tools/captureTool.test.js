import { captureTool } from './captureTool.js';
describe('captureTool', () => {
  it('exports expected handlers', () => {
    expect(typeof captureTool.onMouseDown).toBe('function');
    expect(typeof captureTool.onMouseMove).toBe('function');
    expect(typeof captureTool.onMouseUp).toBe('function');
    expect(typeof captureTool.drawOverlay).toBe('function');
  });

  it('builds preview perimeter and captures live cells on move', () => {
    const toolState = { start: { x: 1, y: 2 }, end: null, preview: [], capturedCells: [] };
    const live = new Map([
      ['1,2', true],
      ['2,3', true],
      ['9,9', true],
      ['bad-key', true],
    ]);

    captureTool.onMouseMove(toolState, 3, 4, null, () => live);

    expect(toolState.end).toEqual({ x: 3, y: 4 });
    expect(toolState.preview).toEqual([
      [1, 2], [1, 4],
      [2, 2], [2, 4],
      [3, 2], [3, 4],
      [1, 3], [3, 3],
    ]);
    expect(toolState.capturedCells).toEqual([[1, 2], [2, 3]]);
  });

  it('normalizes captured cells and invokes callback on mouse up', () => {
    const toolState = { start: { x: 10, y: 10 }, end: { x: 12, y: 12 }, preview: [[10, 10]], capturedCells: [[10, 10]] };
    const liveCells = {
      forEachCell: (cb) => {
        cb(10, 10);
        cb(11, 11);
        cb(13, 13);
      },
    };
    const onCaptureComplete = jest.fn();

    captureTool.onMouseUp(toolState, 12, 12, null, () => liveCells, { onCaptureComplete });

    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    expect(onCaptureComplete.mock.calls[0][0]).toEqual({
      cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      width: 3,
      height: 3,
      originalBounds: { minX: 10, maxX: 12, minY: 10, maxY: 12 },
      cellCount: 2,
    });
    expect(toolState).toEqual({ start: null, end: null, preview: [], capturedCells: [] });
  });

  it('does not throw when capture callback fails', () => {
    const toolState = { start: { x: 0, y: 0 }, end: null, preview: [], capturedCells: [] };
    const onCaptureComplete = jest.fn(() => {
      throw new Error('boom');
    });

    expect(() => captureTool.onMouseUp(toolState, 0, 0, null, null, { onCaptureComplete })).not.toThrow();
  });
});
