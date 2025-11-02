// Pure shape rotation utilities for Game of Life shapes
// Each cell is [x, y] or {x, y}

function normalizeCells(cells) {
  // Convert all cells to [x, y] format
  return cells.map(cell => Array.isArray(cell) ? cell : [cell.x, cell.y]);
}

function rotate90(cells) {
  // Rotate 90° clockwise: (x, y) => (y, -x)
  const norm = normalizeCells(cells);
  return norm.map(([x, y]) => [y, -x]);
}

function rotate180(cells) {
  // Rotate 180°: (x, y) => (-x, -y)
  const norm = normalizeCells(cells);
  return norm.map(([x, y]) => [-x, -y]);
}

function rotate270(cells) {
  // Rotate 270° clockwise (or 90° CCW): (x, y) => (-y, x)
  const norm = normalizeCells(cells);
  return norm.map(([x, y]) => [-y, x]);
}

export function rotateShape(cells, angle) {
  // angle: 90, 180, 270
  if (angle === 90) return rotate90(cells);
  if (angle === 180) return rotate180(cells);
  if (angle === 270) return rotate270(cells);
  return cells;
}

export { rotate90, rotate180, rotate270 };
