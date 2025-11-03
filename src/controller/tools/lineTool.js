// Bresenham line drawing tool
// Line drawing constants
const LINE_DIRECTION_POS = 1;
const LINE_DIRECTION_NEG = -1;
const ERROR_MULTIPLIER = 2;

export const lineTool = {
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y, setCellAlive) {
    if (!state.start) return;
    state.last = { x, y };
    // preview only; do not commit until mouseup
    state.preview = computeLine(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive, setCellsAliveBulk) {
    if (!state.start) return;
    const pts = computeLine(state.start.x, state.start.y, x, y);
    if (typeof setCellsAliveBulk === 'function') {
      const updates = pts.map(([px, py]) => [px, py, true]);
      setCellsAliveBulk(updates);
    } else {
      for (const [px, py] of pts) {
        setCellAlive(px, py, true);
      }
    }
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(renderer, ctx, state, cellSize) {
    if (!state.start || !state.last) {
      return;
    }
    const previewPoints = computeLine(state.start.x, state.start.y, state.last.x, state.last.y);
    if (!previewPoints || previewPoints.length === 0) {
      return;
    }
  ctx.strokeStyle = 'rgba(0,255,0,0.7)';
  ctx.lineWidth = cellSize;
  ctx.beginPath();

    for (const pt of previewPoints) {
      // Draw a filled rectangle for each cell in the line
      const screenCoords = renderer.cellToScreen(pt[0], pt[1]);
      ctx.fillStyle = 'rgba(0,255,0,0.4)';
      ctx.fillRect(screenCoords.x, screenCoords.y, cellSize, cellSize);
    }
  },

  getOverlay(state, cellSize) {
    return {
      draw(renderer) {
        const ctx = renderer.ctx;
        lineTool.drawOverlay(renderer, ctx, state, cellSize);
      }
    };
  }
};

const computeLine = (x0, y0, x1, y1) => {
  const pts = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? LINE_DIRECTION_POS : LINE_DIRECTION_NEG;
  const sy = y0 < y1 ? LINE_DIRECTION_POS : LINE_DIRECTION_NEG;
  let err = dx + dy;

  let x = x0;
  let y = y0;
  while (true) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = ERROR_MULTIPLIER * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}
