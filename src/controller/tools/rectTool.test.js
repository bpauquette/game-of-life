import { rectTool } from './rectTool';
describe('rectTool', () => {
  it('exports expected handlers', () => {
    expect(typeof rectTool.onMouseDown).toBe('function');
    expect(typeof rectTool.onMouseMove).toBe('function');
    expect(typeof rectTool.onMouseUp).toBe('function');
    expect(typeof rectTool.drawOverlay).toBe('function');
  });
});
