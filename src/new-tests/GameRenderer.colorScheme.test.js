/*
  Tests for GameRenderer colorScheme switching behavior.
  Verifies:
  - Renderer syncs background/grid from provided colorScheme during render
  - Cell colors come from colorScheme.getCellColor
  - Grid cache is recreated when colors change
  - Passing null scheme retains previously-set scheme
*/

import { GameRenderer } from '../../src/view/GameRenderer';

function createMockCanvas({ width = 400, height = 300 } = {}) {
  // Minimal 2D context stub with methods/properties used by GameRenderer
  const ctxCalls = { fillRects: [], strokes: [], drawImages: [] };
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
    moveTo: jest.fn(),
    lineTo: jest.fn(),
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

function makeScheme({ background, gridColor, name }) {
  const marker = name || `${background}/${gridColor}`;
  return {
    background,
    gridColor,
    getCellColor: (x, y) => `${marker}:(${x},${y})`,
  };
}

function makeLiveCells(cells = [[0, 0]]) {
  const map = new Map();
  for (const [x, y] of cells) {
    map.set(`${x},${y}`, true);
  }
  return map;
}

describe('GameRenderer colorScheme switching', () => {
  test('updates background/grid and cell colors when scheme changes', () => {
    const { canvas, ctx, ctxCalls } = createMockCanvas({ width: 500, height: 400 });
    const renderer = new GameRenderer(canvas, { showGrid: true });
    // Ensure a reasonable viewport
    renderer.setViewport(0, 0, 10);

    const live = makeLiveCells([[0, 0]]);
    const schemeA = makeScheme({ background: '#111111', gridColor: '#aaaaaa', name: 'A' });

    renderer.render(live, schemeA, null);

    // Renderer should remember and apply scheme A
    expect(renderer.currentColorScheme).toBe(schemeA);
    expect(renderer.options.backgroundColor).toBe('#111111');
    expect(renderer.options.gridColor).toBe('#aaaaaa');

    // One cell was drawn with scheme A color
    const lastFill = ctxCalls.fillRects.at(-1);
    expect(lastFill).toBeDefined();
    expect(ctx.fillStyle).toBe('A:(0,0)'); // current fillStyle after drawCells

    const gridCacheAfterA = renderer.gridCache;
    expect(gridCacheAfterA).toBeTruthy();

    // Switch to scheme B
    const schemeB = makeScheme({ background: '#222222', gridColor: '#bbbbbb', name: 'B' });

    renderer.render(live, schemeB, null);

    // Renderer should now use scheme B
    expect(renderer.currentColorScheme).toBe(schemeB);
    expect(renderer.options.backgroundColor).toBe('#222222');
    expect(renderer.options.gridColor).toBe('#bbbbbb');

    // Cell color should reflect scheme B
    const lastFillB = ctxCalls.fillRects.at(-1);
    expect(lastFillB).toBeDefined();
    expect(ctx.fillStyle).toBe('B:(0,0)');

    // Grid cache should have been invalidated and recreated
    const gridCacheAfterB = renderer.gridCache;
    expect(gridCacheAfterB).toBeTruthy();
    expect(gridCacheAfterB).not.toBe(gridCacheAfterA);
  });

  test('retains previous scheme when null is passed', () => {
    const { canvas, ctx } = createMockCanvas();
    const renderer = new GameRenderer(canvas, { showGrid: true });
    renderer.setViewport(0, 0, 8);

    const live = makeLiveCells([[1, 2]]);
    const scheme = makeScheme({ background: '#101010', gridColor: '#c0c0c0', name: 'Keep' });

    renderer.render(live, scheme, null);
    expect(renderer.currentColorScheme).toBe(scheme);
    expect(ctx.fillStyle).toBe('Keep:(1,2)');

    // Now pass null scheme: renderer should keep using the last one
    renderer.render(live, null, null);
    expect(renderer.currentColorScheme).toBe(scheme);
    expect(ctx.fillStyle).toBe('Keep:(1,2)');
  });
});
