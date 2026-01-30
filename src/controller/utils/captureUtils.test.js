import { 
  captureCellsInArea, 
  formatCaptureAsShape, 
  validateCapture, 
  generateCapturePreview, 
  getCaptureCenter 
} from './captureUtils.js';

describe('captureUtils', () => {
  it('exports all expected functions', () => {
    expect(typeof captureCellsInArea).toBe('function');
    expect(typeof formatCaptureAsShape).toBe('function');
    expect(typeof validateCapture).toBe('function');
    expect(typeof generateCapturePreview).toBe('function');
    expect(typeof getCaptureCenter).toBe('function');
  });

  it('captureCellsInArea returns captureData object', () => {
    const getLiveCells = () => new Set(['1,1', '2,2']);
    const result = captureCellsInArea({x:1,y:1}, {x:2,y:2}, getLiveCells);
    expect(typeof result).toBe('object');
    expect(Array.isArray(result.cells)).toBe(true);
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
  });

  it('formatCaptureAsShape returns object', () => {
    const captureData = { cells: [{x:0,y:0}], width: 1, height: 1 };
    const obj = formatCaptureAsShape(captureData, 'name', 'desc');
    expect(typeof obj).toBe('object');
    expect(obj.name).toBe('name');
  });

  it('validateCapture returns object with isValid', () => {
    const captureData = { cells: [{x:0,y:0}], width: 1, height: 1, cellCount: 1, isEmpty: false };
    const result = validateCapture(captureData);
    expect(typeof result).toBe('object');
    expect(typeof result.isValid).toBe('boolean');
  });

  it('generateCapturePreview returns array', () => {
    const captureData = { cells: [{x:0,y:0}], width: 1, height: 1 };
    const preview = generateCapturePreview(captureData);
    expect(Array.isArray(preview)).toBe(true);
    expect(Array.isArray(preview[0])).toBe(true);
  });

  it('getCaptureCenter returns object', () => {
    const captureData = { width: 3, height: 3 };
    const center = getCaptureCenter(captureData);
    expect(typeof center).toBe('object');
    expect(typeof center.x).toBe('number');
    expect(typeof center.y).toBe('number');
  });
});
