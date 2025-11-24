/*
  Tests for GameRenderer colorScheme switching behavior.
  Verifies:
  - Renderer syncs background/grid from provided colorScheme during render
  - Cell colors come from colorScheme.getCellColor
  - Grid cache is recreated when colors change
  - Passing null scheme retains previously-set scheme
*/

import { GameRenderer } from './GameRenderer';

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

// This test suite was moved to src/new-tests/GameRenderer.colorScheme.test.js
// Keeping this file temporarily to avoid duplicate executions until cleanup.
