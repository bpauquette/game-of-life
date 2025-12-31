// drawShapes.js — shared shape logic for tools and scripting

// Rectangle perimeter (outline only)
export function getRectanglePerimeter(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cells = new Set();
  for (let x = minX; x <= maxX; x++) {
    cells.add(`${x},${minY}`);
    cells.add(`${x},${maxY}`);
  }
  for (let y = minY + 1; y < maxY; y++) {
    cells.add(`${minX},${y}`);
    cells.add(`${maxX},${y}`);
  }
  return cells;
}

// Filled rectangle
export function getRectangleCells(x, y, w, h) {
  const cells = new Set();
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      cells.add(`${x + dx},${y + dy}`);
    }
  }
  return cells;
}

// Circle perimeter (outline only, using bounding box)
export function getCirclePerimeterFromBounds(x0, y0, x1, y1) {
  // Compute center and radius from bounding box
  const cx = Math.round((x0 + x1) / 2);
  const cy = Math.round((y0 + y1) / 2);
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  const r = Math.max(rx, ry);
  return getCirclePerimeter(cx, cy, r);
}

// Circle perimeter (outline only)
export function getCirclePerimeter(cx, cy, r) {
  const cells = new Set();
  const rr = Math.max(0, Math.round(r));
  // Midpoint circle algorithm (8-way symmetry)
  let x = rr;
  let y = 0;
  let err = 0;
  while (x >= y) {
    [
      [x, y], [y, x], [-y, x], [-x, y],
      [-x, -y], [-y, -x], [y, -x], [x, -y]
    ].forEach(([dx, dy]) => cells.add(`${cx + dx},${cy + dy}`));
    y++;
    if (err <= 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err -= 2 * x + 1;
    }
  }
  return cells;
}

// Filled circle
export function getCircleCells(cx, cy, r) {
  const cells = new Set();
  const rr = Math.max(0, Math.round(r));
  for (let dx = -rr; dx <= rr; dx++) {
    for (let dy = -rr; dy <= rr; dy++) {
      if (dx * dx + dy * dy <= rr * rr) {
        cells.add(`${cx + dx},${cy + dy}`);
      }
    }
  }
  return cells;
}

// Bresenham's line algorithm
export function getLineCells(x0, y0, x1, y1) {
  const cells = new Set();
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, e2;
  while (true) {
    cells.add(`${x0},${y0}`);
    if (x0 === x1 && y0 === y1) break;
    e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return cells;
}

// Ellipse perimeter (outline only, axis-aligned)
export function getEllipsePerimeter(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const a = (maxX - minX) / 2;
  const b = (maxY - minY) / 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cells = new Set();
  for (let t = 0; t < 2 * Math.PI; t += 0.01) {
    const x = Math.round(cx + a * Math.cos(t));
    const y = Math.round(cy + b * Math.sin(t));
    cells.add(`${x},${y}`);
  }
  return cells;
}

// Eraser: rectangle region (returns all cells in region)
export function getRectRegion(x0, y0, x1, y1) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cells = new Set();
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      cells.add(`${x},${y}`);
    }
  }
  return cells;
}

// Random rectangle: fill region with random live cells (probability p)
export function getRandomRectCells(x0, y0, x1, y1, p = 0.5) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const cells = new Set();
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (Math.random() < p) cells.add(`${x},${y}`);
    }
  }
  return cells;
}
