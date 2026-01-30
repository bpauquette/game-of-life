import { GameRenderer } from '../view/GameRenderer.js';
import { makeShapePreviewWithCrosshairsOverlay } from '../overlays/overlayTypes.js';

function makeMockCanvas(width = 400, height = 300) {
  const calls = [];
  const ctx = {
    setTransform: () => {},
    scale: () => {},
    fillRect: () => {},
    beginPath: () => { calls.push({ op: 'beginPath' }); },
    moveTo: (x, y) => { calls.push({ op: 'moveTo', x, y }); },
    lineTo: (x, y) => { calls.push({ op: 'lineTo', x, y }); },
    stroke: () => { calls.push({ op: 'stroke' }); },
    save: () => {},
    restore: () => {},
    arc: () => { calls.push({ op: 'arc' }); },
    fill: () => { calls.push({ op: 'fill' }); },
    fillText: () => {},
    strokeRect: () => {},
    clearRect: () => {},
  };

  const canvas = {
    width: Math.ceil(width),
    height: Math.ceil(height),
    style: { width: Math.ceil(width) + 'px', height: Math.ceil(height) + 'px' },
    getContext: (type) => ctx,
    getBoundingClientRect: () => ({ width, height }),
    parentElement: null,
  };
  return { canvas, ctx, calls };
}

describe('GameRenderer crosshair drawing uses fractional coords', () => {
  test('uses cursor.fx/fy for crosshair center when provided', () => {
    const { canvas, calls } = makeMockCanvas(320, 240);

    const renderer = new GameRenderer(canvas, { debugLogs: false });

    // Set a deterministic viewport: center at 0 offset, cellSize 20
    renderer.viewport.offsetX = 0;
    renderer.viewport.offsetY = 0;
    renderer.viewport.cellSize = 20;
    renderer.viewport.width = 320;
    renderer.viewport.height = 240;

    // Choose a fractional cursor
    const cursor = { x: 5, y: 6, fx: 5.25, fy: 6.5 };
    const overlay = makeShapePreviewWithCrosshairsOverlay([{ x: 0, y: 0 }], { x: 0, y: 0 }, cursor, { color: '#00ffff' });

    // Render overlay
    renderer.render(null, null, overlay);

    // Compute expected centerY from fractional coordinate using renderer.cellToScreen
    const screenFx = renderer.cellToScreen(cursor.fx, cursor.fy);
    const expectedCenterY = screenFx.y + renderer.viewport.cellSize / 2;

    // Find the moveTo/lineTo pair closest to expectedCenterY (crosshair)
    let crosshairMove = null;
    let bestDist = Infinity;
    for (let i = 0; i < calls.length - 1; i++) {
      const a = calls[i];
      const b = calls[i + 1];
      if (a.op === 'moveTo' && a.x === 0 && b.op === 'lineTo' && b.x === renderer.viewport.width) {
        const dist = Math.abs(a.y - expectedCenterY);
        if (dist < bestDist) {
          bestDist = dist;
          crosshairMove = a;
        }
      }
    }
    expect(crosshairMove).toBeDefined();

    // Allow small float tolerance
    expect(crosshairMove.y).toBeCloseTo(expectedCenterY, 6);
  });
});
