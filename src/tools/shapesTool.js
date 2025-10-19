// shapesTool.js — handles preview and placement of shapes selected from the
// Shape Palette. This tool uses the shared toolState object to store a
// non-reactive selectedShapeData and the preview anchor/last coordinates.
import logger from '../utils/logger';

const SHAPE_PREVIEW_ALPHA = 0.45;
const STROKE_WIDTH_SCALE_FACTOR = 0.06;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 2;
const DEFAULT_CELL_COLOR = '#222';
const FULL_OPACITY = 1;
const OUTLINE_STROKE_COLOR = 'rgba(255,255,255,0.22)';
const DEFAULT_CELL_X = 0;
const DEFAULT_CELL_Y = 0;

export const shapesTool = {
  onMouseDown(toolState, x, y) {
    toolState.start = { x, y };
    toolState.last = { x, y };
    toolState.dragging = true;
  },

  onMouseMove(toolState, x, y) {
    // update preview position
    toolState.last = { x, y };
  },

  // onMouseUp receives the helpers; placeShape will commit the shape into
  // the chunked game state. setCellAlive is unused but accepted for parity.
  onMouseUp(toolState, x, y, setCellAlive, placeShape) {
    const last = toolState.last || (x !== undefined ? { x, y } : null);
    if (last && placeShape) {
      placeShape(last.x, last.y);
    }
    // clear preview state
    toolState.start = null;
    toolState.last = null;
    toolState.dragging = false;
  },

  drawOverlay(ctx, toolState, cellSize, computedOffset, colorScheme) {
    try {
      const sel = toolState.selectedShapeData;
      const last = toolState.last;
      if (!sel || !last) return;

      // normalize cells: either an array of [x,y] pairs or an object { cells: [...] }
      let cells = [];
      if (Array.isArray(sel)) cells = sel;
      else if (sel && Array.isArray(sel?.cells)) cells = sel.cells;
      else return;

      if (!cells.length) return;

      ctx.save();
      ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
      const strokeW = Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, Math.floor(cellSize * STROKE_WIDTH_SCALE_FACTOR)));
      for (const c of cells) {
        const cx = c?.x ?? (Array.isArray(c) ? c[DEFAULT_CELL_X] : DEFAULT_CELL_X);
        const cy = c?.y ?? (Array.isArray(c) ? c[DEFAULT_CELL_Y] : DEFAULT_CELL_Y);
        const drawX = (last.x + cx) * cellSize - computedOffset.x;
        const drawY = (last.y + cy) * cellSize - computedOffset.y;
        try {
          ctx.fillStyle = (typeof colorScheme?.getCellColor === 'function') ? colorScheme.getCellColor(last.x + cx, last.y + cy) : DEFAULT_CELL_COLOR;
        } catch (err) {
          logger.debug('colorScheme.getCellColor failed:', err);
          ctx.fillStyle = DEFAULT_CELL_COLOR;
        }
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
        // outline for visibility regardless of theme
        ctx.globalAlpha = FULL_OPACITY;
        ctx.strokeStyle = OUTLINE_STROKE_COLOR;
        ctx.lineWidth = strokeW;
        ctx.strokeRect(drawX, drawY, cellSize, cellSize);
        ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
      }
      ctx.restore();
    } catch (err) {
      logger.error('shapesTool.drawOverlay error:', err);
    }
  }
};
