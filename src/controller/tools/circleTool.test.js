import { circleTool } from './circleTool';
describe('circleTool', () => {
  it('exports expected handlers', () => {
    expect(typeof circleTool.onMouseDown).toBe('function');
    expect(typeof circleTool.onMouseMove).toBe('function');
    expect(typeof circleTool.onMouseUp).toBe('function');
    expect(typeof circleTool.drawOverlay).toBe('function');
  });
});
