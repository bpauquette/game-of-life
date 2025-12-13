import { captureTool } from './captureTool';
describe('captureTool', () => {
  it('exports expected handlers', () => {
    expect(typeof captureTool.onMouseDown).toBe('function');
    expect(typeof captureTool.onMouseMove).toBe('function');
    expect(typeof captureTool.onMouseUp).toBe('function');
    expect(typeof captureTool.drawOverlay).toBe('function');
  });
});
