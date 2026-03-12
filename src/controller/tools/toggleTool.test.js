import { toggleTool } from './toggleTool.js';

describe('toggleTool', () => {
  it('exports expected handlers', () => {
    expect(typeof toggleTool.onMouseDown).toBe('function');
    expect(typeof toggleTool.onMouseMove).toBe('function');
    expect(typeof toggleTool.onMouseUp).toBe('function');
    expect(typeof toggleTool.drawOverlay).toBe('function');
  });

  it('paints cells alive along drag path by default', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };

    toggleTool.onMouseDown(toolState, 0, 0, setCellAlive);
    expect(alive.has('0,0')).toBe(true);

    toggleTool.onMouseMove(toolState, 2, 0, setCellAlive);
    expect(alive.has('0,0')).toBe(true);
    expect(alive.has('1,0')).toBe(true);
    expect(alive.has('2,0')).toBe(true);
  });

  it('paints a clicked cell once, even if a stationary move event is emitted', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    toggleTool.onMouseDown(toolState, 5, 5, setCellAlive);
    toggleTool.onMouseMove(toolState, 5, 5, setCellAlive);
    toggleTool.onMouseUp(toolState);

    expect(alive.has('5,5')).toBe(true);
    expect(toolState.start).toBeNull();
    expect(toolState.last).toBeNull();
  });

  it('ignores duplicate mouse-down events in the same stroke', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive);
    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive);
    expect(alive.has('3,3')).toBe(true);

    toggleTool.onMouseUp(toolState);
    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive);
    expect(alive.has('3,3')).toBe(true);
  });

  it('paints on first mouse-down even when start/last are already populated', () => {
    const toolState = {
      start: { x: 10, y: 10 },
      last: { x: 10, y: 10 },
      dragging: true
    };
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    toggleTool.onMouseDown(toolState, 2, 4, setCellAlive);

    expect(alive.has('2,4')).toBe(true);
    expect(toolState.start).toEqual({ x: 2, y: 4 });
    expect(toolState.last).toEqual({ x: 2, y: 4 });
  });

  it('does not repaint a cell when a drag path revisits it', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    toggleTool.onMouseDown(toolState, 0, 0, setCellAlive);
    toggleTool.onMouseMove(toolState, 1, 0, setCellAlive);
    toggleTool.onMouseMove(toolState, 0, 0, setCellAlive);

    expect(alive.has('0,0')).toBe(true);
    expect(alive.has('1,0')).toBe(true);
  });

  it('paints cells dead when drawAlive is false', () => {
    const toolState = { drawAlive: false };
    const alive = new Set(['0,0', '1,0']);
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };

    toggleTool.onMouseDown(toolState, 0, 0, setCellAlive);
    toggleTool.onMouseMove(toolState, 1, 0, setCellAlive);

    expect(alive.has('0,0')).toBe(false);
    expect(alive.has('1,0')).toBe(false);
  });
});
