// Circle (perimeter-only) tool - commits on mouseup
export const circleTool = {
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    const r = Math.round(Math.hypot(x - state.start.x, y - state.start.y));
    state.preview = computeCirclePerimeter(state.start.x, state.start.y, r);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const r = Math.round(Math.hypot(x - state.start.x, y - state.start.y));
    const pts = computeCirclePerimeter(state.start.x, state.start.y, r);
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

const computeCirclePerimeter = (cx, cy, r) => {
  const pts = [];
  if (r <= 0) return pts;
  // Midpoint / Bresenham circle algorithm (integer points on circumference)
  let x = r;
  let y = 0;
  let dx = 1 - (r << 1);
  let dy = 1;
  let err = 0;

  const addOctants = (px, py) => {
    pts.push([cx + px, cy + py]);
    pts.push([cx + py, cy + px]);
    pts.push([cx - py, cy + px]);
    pts.push([cx - px, cy + py]);
    pts.push([cx - px, cy - py]);
    pts.push([cx - py, cy - px]);
    pts.push([cx + py, cy - px]);
    pts.push([cx + px, cy - py]);
  };

  while (x >= y) {
    addOctants(x, y);
    y++;
    err += dy;
    dy += 2;
    if ((err << 1) + dx > 0) {
      x--;
      err += dx;
      dx += 2;
    }
  }

  // Deduplicate points
  const seen = new Set();
  const unique = [];
  for (const p of pts) {
    const px = p[0];
    const py = p[1];
    const key = `${px},${py}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push([px, py]);
    }
  }
  return unique;
}
