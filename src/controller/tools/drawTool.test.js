import { drawTool } from './drawTool.js';
describe('drawTool', () => {
  it('exports expected handlers', () => {
    expect(typeof drawTool.onMouseDown).toBe('function');
    expect(typeof drawTool.onMouseMove).toBe('function');
    expect(typeof drawTool.onMouseUp).toBe('function');
    expect(typeof drawTool.drawOverlay).toBe('function');
  });

  it('paints alive by default', () => {
    const setCellAlive = jest.fn();
    const state = {};

    drawTool.onMouseDown(state, 1, 2, setCellAlive);
    drawTool.onMouseMove(state, 2, 2, setCellAlive);

    expect(setCellAlive).toHaveBeenCalledWith(1, 2, true);
    expect(setCellAlive).toHaveBeenCalledWith(2, 2, true);
  });
});
