import { GameRenderer } from '../../src/view/GameRenderer.js';
import { makeShapePreviewOverlay, makeCellsHighlightOverlay } from '../../src/overlays/overlayTypes.js';

function createMockCanvas({ width = 300, height = 200 } = {}) {
  const calls = { fillRect: [], drawImage: [], setTransform: [] };
  const ctx = {
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    setTransform: (...args) => calls.setTransform.push(args),
    fillRect: (...args) => calls.fillRect.push(args),
    drawImage: (...args) => calls.drawImage.push(args),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
  };
  return {
    calls,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }),
    style: {},
  };
}

describe('GameRenderer overlay descriptors', () => {
  let canvas;
  let renderer;

  beforeEach(() => {
    canvas = createMockCanvas();
    renderer = new GameRenderer(canvas, { showGrid: false });
    renderer.setViewport(0, 0, 10);
  });

  test('shapePreview draws cells at origin+offset', () => {
    const overlay = makeShapePreviewOverlay([{ x: 1, y: 1 }, { x: 2, y: 1 }], { x: 5, y: 5 }, { alpha: 0.5, color: '#0f0' });
    renderer.render(new Map(), null, overlay);
    // Two cells should be drawn
    expect(canvas.calls.fillRect.length).toBeGreaterThanOrEqual(2);
  });

  test('cellsHighlight draws absolute cells', () => {
    const overlay = makeCellsHighlightOverlay([{ x: 3, y: 4 }, { x: -1, y: -2 }], { alpha: 0.4, color: '#fff' });
    renderer.render(new Map(), null, overlay);
    // At least two fillRect calls for the two cells; grid cache may also draw via main ctx in this test environment
    expect(canvas.calls.fillRect.length).toBeGreaterThanOrEqual(2);
  });
});
