import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes.js';

// Midpoint ellipse algorithm for computing ellipse perimeter
const computeEllipsePerimeter = (x0, y0, x1, y1) => {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);

  // Radii based on dragged rectangle, ensure at least 1 so small drags still draw something
  const rx = Math.max(1, Math.floor((xMax - xMin) / 2));
  const ry = Math.max(1, Math.floor((yMax - yMin) / 2));

  // Center in cell coordinates
  const cx = xMin + rx;
  const cy = yMin + ry;

  const pts = [];

  const plot4 = (px, py) => {
    pts.push([cx + px, cy + py]);
    pts.push([cx - px, cy + py]);
    pts.push([cx + px, cy - py]);
    pts.push([cx - px, cy - py]);
  };

  // Midpoint ellipse algorithm (integer, symmetric in all quadrants)
  let x = 0;
  let y = ry;

  const rx2 = rx * rx;
  const ry2 = ry * ry;

  // Region 1
  let d1 = ry2 - rx2 * ry + 0.25 * rx2;
  while (2 * ry2 * x <= 2 * rx2 * y) {
    plot4(x, y);
    if (d1 < 0) {
      x += 1;
      d1 += 2 * ry2 * x + ry2;
    } else {
      x += 1;
      y -= 1;
      d1 += 2 * ry2 * x - 2 * rx2 * y + ry2;
    }
  }

  // Region 2
  let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
  while (y >= 0) {
    plot4(x, y);
    if (d2 > 0) {
      y -= 1;
      d2 += -2 * rx2 * y + rx2;
    } else {
      x += 1;
      y -= 1;
      d2 += 2 * ry2 * x - 2 * rx2 * y + rx2;
    }
  }

  // Deduplicate points (dragging on a discrete grid can revisit the same cell)
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

// Oval (ellipse) perimeter-only tool - axis-aligned, commits on mouseup
export const ovalTool = {
  getOverlay(state) {
    if (!state.start || !state.last) return null;
    // Descriptor-based overlay: highlight absolute preview cells
    const cells = Array.isArray(state.preview) ? state.preview : [];
    return makeCellsHighlightOverlay(cells, { color: 'rgba(255,0,0,0.4)', alpha: 0.6 });
  },
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

  onMouseUp(state, x, y, setCellAlive, setCellsAliveBulk) {
    if (!state.start) return;
    const pts = computeEllipsePerimeter(state.start.x, state.start.y, x, y);
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
      // const cellSize = getCellSize(); // Removed unused variable assignment, kept parameter
      if (!state.start || !state.last) return;
      if (state.preview && state.preview.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        for (const p of state.preview) {
          const x = p[0];
          const y = p[1];
          ctx.fillRect(x * cellSize - offset.x, y * cellSize - offset.y, cellSize, cellSize);
        }
        ctx.restore();
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Oval overlay error:', e);
    }
  }
};
