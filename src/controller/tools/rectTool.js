// Rectangle perimeter-only tool
// Rectangle tool constants
const RECT_PREVIEW_COLOR = 'rgba(255,255,255,0.12)';
const ARRAY_FIRST_ELEMENT = 0;
const ARRAY_SECOND_ELEMENT = 1;
const PERIMETER_BORDER_OFFSET = 1;

export const rectTool = {
  getOverlay(state, cellSize) {
    if (!state.start || !state.last) return null;
    const { ToolOverlay } = require('../../view/GameRenderer');
    return new ToolOverlay(this, state, cellSize);
  },

  onMouseDown(state, x, y) {
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
      // Draw perimeter as lines for better visibility
      const x0 = state.start.x, y0 = state.start.y;
      const x1 = state.last.x, y1 = state.last.y;
      const topLeftX = Math.min(x0, x1);
      const topLeftY = Math.min(y0, y1);
      const bottomRightX = Math.max(x0, x1);
      const bottomRightY = Math.max(y0, y1);
      const screenTopLeftX = topLeftX * cellSize - offset.x;
      const screenTopLeftY = topLeftY * cellSize - offset.y;
      const width = (bottomRightX - topLeftX + 1) * cellSize;
      const height = (bottomRightY - topLeftY + 1) * cellSize;
      ctx.save();
  ctx.strokeStyle = 'rgba(255,0,0,1)';
      ctx.lineWidth = Math.max(2, cellSize / 4);
      ctx.setLineDash([cellSize / 2, cellSize / 2]);
      ctx.strokeRect(screenTopLeftX, screenTopLeftY, width, height);
      ctx.restore();
      // Also fill preview cells for legacy support
      if (state.preview && state.preview.length > 0) {
        ctx.save();
  ctx.fillStyle = 'rgba(255,0,0,0.5)';
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
