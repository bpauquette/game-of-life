import { lineTool } from './lineTool';
describe('lineTool', () => {
  it('exports expected handlers', () => {
    expect(typeof lineTool.onMouseDown).toBe('function');
    expect(typeof lineTool.onMouseMove).toBe('function');
    expect(typeof lineTool.onMouseUp).toBe('function');
    expect(typeof lineTool.drawOverlay).toBe('function');
  });
});
