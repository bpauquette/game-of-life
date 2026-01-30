import { rotateShape, transformShape, rotate90, rotate180, rotate270, flipH, flipV, diag1, diag2 } from './shapeTransforms.js';

describe('shapeTransforms', () => {
  it('rotateShape returns array', () => {
    const cells = [{x:1,y:2},{x:2,y:3}];
    expect(Array.isArray(rotateShape(cells, 90))).toBe(true);
  });
  it('transformShape returns array', () => {
    const cells = [{x:1,y:2},{x:2,y:3}];
    expect(Array.isArray(transformShape(cells, rotate90))).toBe(true);
  });
  it('exports all transforms as functions', () => {
    expect(typeof rotate90).toBe('function');
    expect(typeof rotate180).toBe('function');
    expect(typeof rotate270).toBe('function');
    expect(typeof flipH).toBe('function');
    expect(typeof flipV).toBe('function');
    expect(typeof diag1).toBe('function');
    expect(typeof diag2).toBe('function');
  });
});
