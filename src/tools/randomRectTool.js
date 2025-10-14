// Randomize cells within a dragged rectangle. Commits on mouseup.
export const randomRectTool = {
  // Optionally accept a probability in state.prob (0..1)
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
    if (state.prob == null) state.prob = 0.5;
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeRect(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeRect(state.start.x, state.start.y, x, y);
    const p = Math.max(0, Math.min(1, state.prob ?? 0.5));
    pts.forEach(([px, py]) => {
      setCellAlive(px, py, Math.random() < p);
    });
    state.start = null;
    state.last = null;
    state.preview = [];
  },

  drawOverlay(ctx, state, cellSize, offset) {
    if (!state.preview || state.preview.length === 0) return;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    state.preview.forEach(([x, y]) => {
      ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
    });
  }
};

function computeRect(x0, y0, x1, y1) {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const pts = [];
  for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) pts.push([x, y]);
  return pts;
}
