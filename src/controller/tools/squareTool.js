import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes.js';

const RECT_PREVIEW_COLOR = 'rgba(255,255,255,0.12)';
const ARRAY_FIRST_ELEMENT = 0;
const ARRAY_SECOND_ELEMENT = 1;
const PERIMETER_BORDER_OFFSET = 1;

const computeSquarePerimeter = (x0, y0, x1, y1) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const size = Math.max(dx, dy); // Use the larger dimension to determine square size
  const xDir = x1 >= x0 ? 1 : -1;
  const yDir = y1 >= y0 ? 1 : -1;
  const xMin = x0;
  const xMax = x0 + (size * xDir);
  const yMin = y0;
  const yMax = y0 + (size * yDir);
  const pts = [];
  for (let x = Math.min(xMin, xMax); x <= Math.max(xMin, xMax); x++) {
    pts.push([x, yMin]);
    if (yMax !== yMin) pts.push([x, yMax]);
  }
  for (let y = Math.min(yMin, yMax) + PERIMETER_BORDER_OFFSET; y <= Math.max(yMin, yMax) - PERIMETER_BORDER_OFFSET; y++) {
    pts.push([xMin, y]);
    if (xMax !== xMin) pts.push([xMax, y]);
  }
  return pts;
};

export const squareTool = {
  getOverlay(state) {
    if (!state.start || !state.last) return null;
    const cells = Array.isArray(state.preview) ? state.preview : [];
    return makeCellsHighlightOverlay(cells, { color: RECT_PREVIEW_COLOR, alpha: 0.6 });
  },
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },
  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeSquarePerimeter(state.start.x, state.start.y, x, y);
  },
  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeSquarePerimeter(state.start.x, state.start.y, x, y);
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
      if (typeof console !== 'undefined') console.warn('Square overlay error:', e);
    }
  }
};
