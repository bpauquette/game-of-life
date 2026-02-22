import { toggleTool } from './toggleTool.js';

describe('toggleTool', () => {
  it('exports expected handlers', () => {
    expect(typeof toggleTool.onMouseDown).toBe('function');
    expect(typeof toggleTool.onMouseMove).toBe('function');
    expect(typeof toggleTool.onMouseUp).toBe('function');
    expect(typeof toggleTool.drawOverlay).toBe('function');
  });

  it('toggles cells along drag path', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    const isCellAlive = (x, y) => alive.has(`${x},${y}`);

    toggleTool.onMouseDown(toolState, 0, 0, setCellAlive, isCellAlive);
    expect(alive.has('0,0')).toBe(true);

    toggleTool.onMouseMove(toolState, 2, 0, setCellAlive, isCellAlive);
    expect(alive.has('0,0')).toBe(true);
    expect(alive.has('1,0')).toBe(true);
    expect(alive.has('2,0')).toBe(true);
  });

  it('toggles a clicked cell once, even if a stationary move event is emitted', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    const isCellAlive = (x, y) => alive.has(`${x},${y}`);

    toggleTool.onMouseDown(toolState, 5, 5, setCellAlive, isCellAlive);
    toggleTool.onMouseMove(toolState, 5, 5, setCellAlive, isCellAlive);
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
    const isCellAlive = (x, y) => alive.has(`${x},${y}`);

    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive, isCellAlive);
    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive, isCellAlive);
    expect(alive.has('3,3')).toBe(true);

    toggleTool.onMouseUp(toolState);
    toggleTool.onMouseDown(toolState, 3, 3, setCellAlive, isCellAlive);
    expect(alive.has('3,3')).toBe(false);
  });

  it('toggles on first mouse-down even when start/last are already populated', () => {
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
    const isCellAlive = (x, y) => alive.has(`${x},${y}`);

    toggleTool.onMouseDown(toolState, 2, 4, setCellAlive, isCellAlive);

    expect(alive.has('2,4')).toBe(true);
    expect(toolState.start).toEqual({ x: 2, y: 4 });
    expect(toolState.last).toEqual({ x: 2, y: 4 });
  });

  it('does not re-toggle a cell when a drag path revisits it', () => {
    const toolState = {};
    const alive = new Set();
    const setCellAlive = (x, y, isAlive) => {
      const key = `${x},${y}`;
      if (isAlive) alive.add(key);
      else alive.delete(key);
    };
    const isCellAlive = (x, y) => alive.has(`${x},${y}`);

    toggleTool.onMouseDown(toolState, 0, 0, setCellAlive, isCellAlive);
    toggleTool.onMouseMove(toolState, 1, 0, setCellAlive, isCellAlive);
    toggleTool.onMouseMove(toolState, 0, 0, setCellAlive, isCellAlive);

    expect(alive.has('0,0')).toBe(true);
    expect(alive.has('1,0')).toBe(true);
  });
});
