import { makeShapePreviewWithCrosshairsOverlay } from '../overlays/overlayTypes';

describe('Shape preview with crosshairs overlay', () => {
  test('preserves fractional cursor coordinates (fx/fy)', () => {
    const cells = [{ x: 0, y: 0 }];
    const origin = { x: 10, y: 10 };
    const cursor = { x: 12, y: 15, fx: 12.4, fy: 15.75 };

    const overlay = makeShapePreviewWithCrosshairsOverlay(cells, origin, cursor, { color: '#0f0' });

    expect(overlay).toBeDefined();
    expect(overlay.cursor).toBeDefined();
    expect(typeof overlay.cursor.fx).toBe('number');
    expect(typeof overlay.cursor.fy).toBe('number');
    expect(overlay.cursor.fx).toBeCloseTo(12.4, 6);
    expect(overlay.cursor.fy).toBeCloseTo(15.75, 6);
    // Original integer coords still present
    expect(overlay.cursor.x).toBe(12);
    expect(overlay.cursor.y).toBe(15);
  });
});
