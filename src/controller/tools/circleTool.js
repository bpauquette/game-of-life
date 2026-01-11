import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes';

// Helper function: compute circle perimeter using Bresenham/midpoint algorithm
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
    pts.push(
      [cx + px, cy + py],
      [cx + py, cy + px],
      [cx - py, cy + px],
      [cx - px, cy + py],
      [cx - px, cy - py],
      [cx - py, cy - px],
      [cx + py, cy - px],
      [cx + px, cy - py]
    );
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
};

// New function: compute circle that fits within bounding box defined by two points
const computeCirclePerimeterFromBounds = (x0, y0, x1, y1) => {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  
  // Calculate bounding box dimensions
  const width = xMax - xMin;
  const height = yMax - yMin;
  
  // For a circle, use the smaller dimension to ensure it fits in the box
  const diameter = Math.min(width, height);
  const r = Math.max(1, Math.floor(diameter / 2));
  
  // Center the circle in the bounding box
  const cx = Math.floor(xMin + width / 2);
  const cy = Math.floor(yMin + height / 2);
  
  return computeCirclePerimeter(cx, cy, r);
};

// Circle (perimeter-only) tool - commits on mouseup
export const circleTool = {
  getOverlay(state, cellSize) {
    if (!state.start || !state.last) return null;
    // Descriptor-based overlay: highlight absolute preview cells
    const cells = Array.isArray(state.preview) ? state.preview : [];
    return makeCellsHighlightOverlay(cells, { color: 'rgba(0,255,0,0.4)', alpha: 0.6 });
  },
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    state.preview = [];
  },
      

  onMouseMove(state, x, y) {
    if (!state.start) return;
    state.last = { x, y };
    state.preview = computeCirclePerimeterFromBounds(state.start.x, state.start.y, x, y);
  },
     
  onMouseUp(state, x, y, setCellAlive, setCellsAliveBulk) {
    if (!state.start) return;
    const pts = computeCirclePerimeterFromBounds(state.start.x, state.start.y, x, y);
    if (typeof setCellsAliveBulk === 'function') {
      const updates = pts.map(p => [p[0], p[1], true]);
      setCellsAliveBulk(updates);
    } else {
      for (const p of pts) {
        const px = p[0];
        const py = p[1];
        setCellAlive(px, py, true);
      }
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
        ctx.fillStyle = 'rgba(0,255,0,0.4)';
        for (const p of state.preview) {
          const x = p[0];
          const y = p[1];
          ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
        }
        ctx.restore();
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Circle overlay error:', e);
    }
  }
};
