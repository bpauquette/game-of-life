/*
  Tests for GameRenderer grid/cell alignment.
  Verifies:
  - Grid lines are spaced by cellSize and start aligned with computed offset
  - A cell at (0,0) is drawn at the expected screen position for various offsets
*/

import { GameRenderer } from '../../src/view/GameRenderer';

function createMockCanvas({ width = 500, height = 400 } = {}) {
  const ctxCalls = { fillRects: [], strokes: [], drawImages: [], moves: [], lines: [] };
  const ctx = {
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    scale: jest.fn(),
    setTransform: jest.fn(),
    fillRect: jest.fn((x, y, w, h) => {
      ctxCalls.fillRects.push({ x, y, w, h, fillStyle: ctx.fillStyle, globalAlpha: ctx.globalAlpha });
    }),
    beginPath: jest.fn(),
    moveTo: jest.fn((x, y) => ctxCalls.moves.push({ x, y })),
    lineTo: jest.fn((x, y) => ctxCalls.lines.push({ x, y })),
    stroke: jest.fn(() => ctxCalls.strokes.push({ strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth })),
    drawImage: jest.fn((img, x, y) => ctxCalls.drawImages.push({ img, x, y })),
    save: jest.fn(),
    restore: jest.fn(),
    fillText: jest.fn(),
    strokeRect: jest.fn(),
    clearRect: jest.fn(),
  };

  const canvas = {
    width,
    height,
    style: {},
    parentElement: null,
    getBoundingClientRect: () => ({ width, height }),
    getContext: jest.fn(() => ctx),
  };

  return { canvas, ctx, ctxCalls };
}

function makeLiveCells(cells = [[0, 0]]) {
  const map = new Map();
  for (const [x, y] of cells) {
    map.set(`${x},${y}`, true);
  }
  return map;
}

function extractVerticalLineXs(ctxCalls, height) {
  const xs = [];
  for (let i = 0; i < ctxCalls.moves.length; i++) {
    const m = ctxCalls.moves[i];
    const l = ctxCalls.lines[i];
    if (!m || !l) continue;
    if (m.y === 0 && l.y === height && m.x === l.x) {
      xs.push(m.x);
    }
  }
  // Keep only non-negative, on-screen lines
  return xs.filter(x => x >= 0).sort((a, b) => a - b);
}

describe('GameRenderer grid/cell alignment', () => {
  test('grid spacing equals cellSize and cell (0,0) aligns at expected screen X', () => {
    const { canvas, ctxCalls } = createMockCanvas({ width: 500, height: 400 });
    const renderer = new GameRenderer(canvas, { showGrid: true });

    const cellSize = 10; // integer size
    const offsetsToTest = [0, 1, 2.5, -3.2];

    for (const offsetX of offsetsToTest) {
      const offsetY = 0;
      renderer.setViewport(offsetX, offsetY, cellSize);
      const live = makeLiveCells([[0, 0]]);

      // Clear previous call history
      ctxCalls.moves.length = 0;
      ctxCalls.lines.length = 0;
      ctxCalls.fillRects.length = 0;

      renderer.render(live, { background: '#000', gridColor: '#888', getCellColor: () => '#fff' }, null);

      // Validate grid spacing
      const vxs = extractVerticalLineXs(ctxCalls, renderer.viewport.height);
      expect(vxs.length).toBeGreaterThan(2);
      const deltas = vxs.slice(1).map((x, i) => x - vxs[i]);
      for (const d of deltas) {
        expect(d).toBeCloseTo(cellSize, 5);
      }

      // Validate cell draw position for (0,0)
      const centerX = renderer.viewport.width / 2;
      const expectedX = (0 - offsetX) * cellSize + centerX;
      const lastFill = ctxCalls.fillRects.at(-1);
      expect(lastFill).toBeDefined();
      expect(lastFill.x).toBeCloseTo(expectedX, 5);
      expect(lastFill.w).toBeCloseTo(cellSize, 5);
    }
  });

  test('fractional cellSize keeps alignment without drift', () => {
    const { canvas, ctxCalls } = createMockCanvas({ width: 600, height: 400 });
    const renderer = new GameRenderer(canvas, { showGrid: true });

    const cellSize = 12.5; // fractional size from DPR snapping
    const offsetX = -1.75;
    const offsetY = 0.9;

    renderer.setViewport(offsetX, offsetY, cellSize);
    const live = makeLiveCells([[0, 0]]);

    // Clear previous calls
    ctxCalls.moves.length = 0;
    ctxCalls.lines.length = 0;
    ctxCalls.fillRects.length = 0;

    renderer.render(live, { background: '#000', gridColor: '#888', getCellColor: () => '#fff' }, null);

    const vxs = extractVerticalLineXs(ctxCalls, renderer.viewport.height);
    expect(vxs.length).toBeGreaterThan(2);

    // For fractional sizes, grid lines are snapped to integer pixels (+0.5),
    // so spacing alternates between floor/ceil(cellSize). Verify each line is
    // within 1px of the ideal position without cumulative drift.
    const centerX = renderer.viewport.width / 2;
    const computedOffsetX = offsetX * cellSize - centerX;
    const startXIdeal = ((-computedOffsetX % cellSize) + cellSize) % cellSize;
    vxs.forEach((xActual, i) => {
      const xIdeal = startXIdeal + i * cellSize;
      expect(Math.abs(xActual - xIdeal)).toBeLessThanOrEqual(1);
    });

    const expectedX = (0 - offsetX) * cellSize + centerX;
    const lastFill = ctxCalls.fillRects.at(-1);
    expect(lastFill).toBeDefined();
    expect(lastFill.x).toBeCloseTo(expectedX, 5);
    expect(lastFill.w).toBeCloseTo(cellSize, 5);
  });
});
