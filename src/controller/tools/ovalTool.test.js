import { ovalTool } from './ovalTool.js';
describe('ovalTool', () => {
  it('exports expected handlers', () => {
    expect(typeof ovalTool.onMouseDown).toBe('function');
    expect(typeof ovalTool.onMouseMove).toBe('function');
    expect(typeof ovalTool.onMouseUp).toBe('function');
    expect(typeof ovalTool.drawOverlay).toBe('function');
  });
});
