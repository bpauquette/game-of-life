// Oval (ellipse) perimeter-only tool - axis-aligned, commits on mouseup
export const ovalTool = {
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeEllipsePerimeter(state.start.x, state.start.y, x, y);
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeEllipsePerimeter(state.start.x, state.start.y, x, y);
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

function computeEllipsePerimeter(x0, y0, x1, y1) {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const rx = Math.max(1, Math.floor((xMax - xMin) / 2));
  const ry = Math.max(1, Math.floor((yMax - yMin) / 2));
  const cx = xMin + rx;
  const cy = yMin + ry;
  const pts = [];

  // Iterate angle steps and compute integer points on ellipse perimeter
  // Choose step based on perimeter approximation to ensure continuity
  const steps = Math.max(8, Math.ceil(2 * Math.PI * Math.max(rx, ry))); 
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const fx = Math.round(cx + rx * Math.cos(theta));
    const fy = Math.round(cy + ry * Math.sin(theta));
    pts.push([fx, fy]);
  }

  // Deduplicate
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
