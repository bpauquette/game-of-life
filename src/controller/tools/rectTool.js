import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes.js';

// Rectangle perimeter-only tool
// Rectangle tool constants
const RECT_PREVIEW_COLOR = 'rgba(255,255,255,0.12)';
const ARRAY_FIRST_ELEMENT = 0;
const ARRAY_SECOND_ELEMENT = 1;
const PERIMETER_BORDER_OFFSET = 1;

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
};

const computeSquarePerimeter = (x0, y0, x1, y1) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const size = Math.max(dx, dy); // Use the larger dimension to determine square size

  // Determine the direction of drag to position the square correctly
  const xDir = x1 >= x0 ? 1 : -1;
  const yDir = y1 >= y0 ? 1 : -1;

  // Calculate square bounds
  const xMin = x0;
  const xMax = x0 + (size * xDir);
  const yMin = y0;
  const yMax = y0 + (size * yDir);

  const pts = [];
  // Top and bottom edges
  for (let x = Math.min(xMin, xMax); x <= Math.max(xMin, xMax); x++) {
    pts.push([x, yMin]);
    if (yMax !== yMin) pts.push([x, yMax]);
  }
  // Left and right edges (excluding corners already added)
  for (let y = Math.min(yMin, yMax) + PERIMETER_BORDER_OFFSET; y <= Math.max(yMin, yMax) - PERIMETER_BORDER_OFFSET; y++) {
    pts.push([xMin, y]);
    if (xMax !== xMin) pts.push([xMax, y]);
  }
  return pts;
};

export const rectTool = {
  getOverlay(state) {
    if (!state.start || !state.last) return null;
    // Descriptor-based overlay: highlight absolute preview cells
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
      console.log('[rectTool] onMouseUp calling setCellAlive', { px, py });
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

// Square tool - always draws squares
export const squareTool = {
  getOverlay(state) {
    if (!state.start || !state.last) return null;
    // Descriptor-based overlay: highlight absolute preview cells
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
  // Preview is just the square perimeter from start to current
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
      if (typeof console !== 'undefined') console.warn('Square overlay error:', e);
    }
  }
};