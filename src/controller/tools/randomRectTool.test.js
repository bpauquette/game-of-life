import { randomRectTool } from './randomRectTool';
describe('randomRectTool', () => {
  it('exports expected handlers', () => {
    expect(typeof randomRectTool.onMouseDown).toBe('function');
    expect(typeof randomRectTool.onMouseMove).toBe('function');
    expect(typeof randomRectTool.onMouseUp).toBe('function');
    expect(typeof randomRectTool.drawOverlay).toBe('function');
  });
});
