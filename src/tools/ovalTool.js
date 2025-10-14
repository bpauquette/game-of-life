// Filled oval (ellipse) tool - axis-aligned, commits on mouseup
export const ovalTool = {
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeFilledEllipse(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeFilledEllipse(state.start.x, state.start.y, x, y);
    pts.forEach(([px, py]) => setCellAlive(px, py, true));
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    if (!state.preview || state.preview.length === 0) return;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    state.preview.forEach(([x, y]) => {
      ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
    });
  }
};

function computeFilledEllipse(x0, y0, x1, y1) {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const rx = Math.max(1, Math.floor((xMax - xMin) / 2));
  const ry = Math.max(1, Math.floor((yMax - yMin) / 2));
  const cx = xMin + rx;
  const cy = yMin + ry;
  const pts = [];
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) pts.push([x, y]);
    }
  }
  return pts;
}
