import { makeShapePreviewWithCrosshairsOverlay } from '../../src/overlays/overlayTypes.js';

describe('makeShapePreviewWithCrosshairsOverlay', () => {
  it('preserves fractional cursor coordinates (no rounding)', () => {
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const origin = { x: 10, y: 20 };
    const cursor = { x: 12.4, y: 20.7 };
    const overlay = makeShapePreviewWithCrosshairsOverlay(cells, origin, cursor, {});
    expect(overlay.type).toBe('shapePreviewWithCrosshairs');
    expect(overlay.origin).toEqual(origin);
    // cursor should retain fractional values
    expect(overlay.cursor.x).toBeCloseTo(12.4);
    expect(overlay.cursor.y).toBeCloseTo(20.7);
  });
});
