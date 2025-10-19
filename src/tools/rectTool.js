// Rectangle perimeter-only tool
export const rectTool = {
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeRectPerimeter(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeRectPerimeter(state.start.x, state.start.y, x, y);
    for (const p of pts) {
      const px = p[0];
      const py = p[1];
      setCellAlive(px, py, true);
    }
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    if (!state.preview || state.preview.length === 0) return;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (const p of state.preview) {
      const x = p[0];
      const y = p[1];
      ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
    }
  }
};

function computeRectPerimeter(x0, y0, x1, y1) {
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
  for (let y = yMin + 1; y <= yMax - 1; y++) {
    pts.push([xMin, y]);
    if (xMax !== xMin) pts.push([xMax, y]);
  }
  return pts;
}
