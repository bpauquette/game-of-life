
import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes';

const ERASER_PREVIEW_COLOR = 'rgba(255,0,0,0.18)';

export const eraserTool = {
  getOverlay(state, cellSize) {
    if (!state.start || !state.last) return null;
    const cells = Array.isArray(state.preview) ? state.preview : [];
    return makeCellsHighlightOverlay(cells, { color: ERASER_PREVIEW_COLOR, alpha: 0.7 });
  },

  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeRectCells(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const cells = computeRectCells(state.start.x, state.start.y, x, y);
    for (const p of cells) {
      const px = p[0];
      const py = p[1];
      setCellAlive(px, py, false);
    }
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    try {
      if (!state.start || !state.last) return;
      if (state.preview && state.preview.length > 0) {
        ctx.save();
        ctx.fillStyle = ERASER_PREVIEW_COLOR;
        for (const p of state.preview) {
          const x = p[0];
          const y = p[1];
          ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
        }
        ctx.restore();
      }
    } catch (e) {
      // Overlay errors must not break main render
    }
  }
}

function computeRectCells(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cells = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      cells.push([x, y]);
    }
  }
  return cells;
}
