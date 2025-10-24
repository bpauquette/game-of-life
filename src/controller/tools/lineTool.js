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

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeLine(state.start.x, state.start.y, x, y);
    for (const [px, py] of pts) {
      setCellAlive(px, py, true);
    }
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    if (!state.preview || state.preview.length === 0) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(1, Math.min(4, cellSize / 6));
    ctx.beginPath();
    let idx = 0;
    for (const [x, y] of state.preview) {
      const cx = x * cellSize - offset.x + cellSize / 2;
      const cy = y * cellSize - offset.y + cellSize / 2;
      if (idx === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      idx++;
    }
    ctx.stroke();
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
