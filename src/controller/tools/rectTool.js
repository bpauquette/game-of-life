// Rectangle perimeter-only tool
// Rectangle tool constants
const RECT_PREVIEW_COLOR = 'rgba(255,255,255,0.12)';
const ARRAY_FIRST_ELEMENT = 0;
const ARRAY_SECOND_ELEMENT = 1;
const PERIMETER_BORDER_OFFSET = 1;

export const rectTool = {
  getOverlay(state, cellSize) {
    if (!state.start || !state.last) return null;
    // Prefer descriptor-based overlay: highlight absolute preview cells
    const { makeCellsHighlightOverlay } = require('../../overlays/overlayTypes');
    const cells = Array.isArray(state.preview) ? state.preview : [];
    return makeCellsHighlightOverlay(cells, { color: RECT_PREVIEW_COLOR, alpha: 0.6 });
  },

  onMouseDown(state, x, y) {
  // Clear previous drag state
  state.start = { x, y };
  state.last = { x, y };
  state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
  // Preview is just the rectangle perimeter from start to current
  state.preview = computeRectPerimeter(state.start.x, state.start.y, x, y);
  },


  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeRectPerimeter(state.start.x, state.start.y, x, y);
    for (const p of pts) {
      const px = p[ARRAY_FIRST_ELEMENT];
      const py = p[ARRAY_SECOND_ELEMENT];
      setCellAlive(px, py, true);
    }
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    try {
      if (!state.start || !state.last) return;
      // Fill each cell in the computed perimeter, matching final placement
      if (state.preview && state.preview.length > 0) {
        ctx.save();
  ctx.fillStyle = RECT_PREVIEW_COLOR;
        for (const p of state.preview) {
          const x = p[ARRAY_FIRST_ELEMENT];
          const y = p[ARRAY_SECOND_ELEMENT];
          ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
        }
        ctx.restore();
      }
    } catch (e) {
      // Never break main render
      if (typeof console !== 'undefined') console.warn('Rect overlay error:', e);
    }
  }
};

const computeRectPerimeter = (x0, y0, x1, y1) => {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const pts = [];
  // Top and bottom edges
  for (let x = xMin; x <= xMax; x++) {
    pts.push([x, yMin]);
    if (yMax !== yMin) pts.push([x, yMax]);
  }
  // Left and right edges (excluding corners already added)
  for (let y = yMin + PERIMETER_BORDER_OFFSET; y <= yMax - PERIMETER_BORDER_OFFSET; y++) {
    pts.push([xMin, y]);
    if (xMax !== xMin) pts.push([xMax, y]);
  }
  return pts;
}
