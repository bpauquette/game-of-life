import { drawTool } from './drawTool';
describe('drawTool', () => {
  it('exports expected handlers', () => {
    expect(typeof drawTool.onMouseDown).toBe('function');
    expect(typeof drawTool.onMouseMove).toBe('function');
    expect(typeof drawTool.onMouseUp).toBe('function');
    expect(typeof drawTool.drawOverlay).toBe('function');
  });
});
