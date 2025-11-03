import { rotateShape } from '../model/shapeTransforms';

// In our renderer, screen Y increases downward. A visual 90° clockwise rotation
// corresponds to the mathematical transform (x, y) -> (-y, x), which is our
// rotateShape(..., 270) implementation. Meanwhile, rotateShape(..., 90) uses
// (x, y) -> (y, -x), which appears as 90° counterclockwise on screen.

describe('shapeTransforms direction consistency', () => {
  // Small L-shape around origin
  const L = [ [0,0], [1,0], [0,1] ];

  function sortCells(cells) {
    return [...cells].map(([x, y]) => `${x},${y}`).sort();
  }

  test('rotate 90 (math CW) appears CCW visually on y-down screen', () => {
    const r90 = rotateShape(L, 90);
    // (x,y)->(y,-x): (0,0)->(0,0); (1,0)->(0,-1); (0,1)->(1,0)
    expect(sortCells(r90)).toEqual(sortCells([[0,0],[0,-1],[1,0]]));
  });

  test('rotate 270 (math) equals 90° clockwise visually on y-down screen', () => {
    const r270 = rotateShape(L, 270);
    // (x,y)->(-y,x): (0,0)->(0,0); (1,0)->(0,1); (0,1)->(-1,0)
    expect(sortCells(r270)).toEqual(sortCells([[0,0],[0,1],[-1,0]]));
  });
});
