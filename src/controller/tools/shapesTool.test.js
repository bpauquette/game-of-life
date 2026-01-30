import { shapesTool } from './shapesTool.js';
describe('shapesTool', () => {
  it('exports expected handlers', () => {
    expect(typeof shapesTool.onMouseDown).toBe('function');
    expect(typeof shapesTool.onMouseMove).toBe('function');
    expect(typeof shapesTool.onMouseUp).toBe('function');
    expect(typeof shapesTool.getOverlay).toBe('function');
  });
});
