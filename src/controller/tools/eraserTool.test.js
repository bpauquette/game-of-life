import { eraserTool } from './eraserTool';
describe('eraserTool', () => {
  it('exports expected handlers', () => {
    expect(typeof eraserTool.onMouseDown).toBe('function');
    expect(typeof eraserTool.onMouseMove).toBe('function');
    expect(typeof eraserTool.onMouseUp).toBe('function');
    expect(typeof eraserTool.drawOverlay).toBe('function');
  });
});
