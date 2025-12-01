import LiveCellIndex from './liveCellIndex';

// Game of Life constants
const NEIGHBOR_RANGE_MIN = -1;
const NEIGHBOR_RANGE_MAX = 1;
const BIRTH_NEIGHBOR_COUNT = 3;
const SURVIVAL_NEIGHBOR_COUNT = 2;

function forEachCell(liveCells, callback) {
  if (liveCells && typeof liveCells.forEachCell === 'function') {
    liveCells.forEachCell(callback);
    return;
  }

  if (liveCells && typeof liveCells.keys === 'function') {
    for (const key of liveCells.keys()) {
      const parts = String(key).split(',');
      if (parts.length !== 2) continue;
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        callback(x, y);
      }
    }
  }
}

function hasCell(liveCells, x, y) {
  if (liveCells && typeof liveCells.forEachCell === 'function' && typeof liveCells.has === 'function') {
    return liveCells.has(x, y);
  }
  const key = `${x},${y}`;
  return typeof liveCells?.has === 'function' ? liveCells.has(key) : false;
}

export const step = (liveCells) => {
  const neighborCounts = new Map(); // Map<x, Map<y, count>>

  const incrementNeighbor = (nx, ny) => {
    let column = neighborCounts.get(nx);
    if (!column) {
      column = new Map();
      neighborCounts.set(nx, column);
    }
    column.set(ny, (column.get(ny) || 0) + 1);
  };

  forEachCell(liveCells, (x, y) => {
    for (let dx = NEIGHBOR_RANGE_MIN; dx <= NEIGHBOR_RANGE_MAX; dx++) {
      for (let dy = NEIGHBOR_RANGE_MIN; dy <= NEIGHBOR_RANGE_MAX; dy++) {
        if (dx === 0 && dy === 0) continue;
        incrementNeighbor(x + dx, y + dy);
      }
    }
  });

  const next = new LiveCellIndex();
  for (const [nx, column] of neighborCounts.entries()) {
    for (const [ny, count] of column.entries()) {
      if (count === BIRTH_NEIGHBOR_COUNT || (count === SURVIVAL_NEIGHBOR_COUNT && hasCell(liveCells, nx, ny))) {
        next.setCellAlive(nx, ny, true);
      }
    }
  }

  return next;
};

// Advance N generations by repeatedly calling `step`.
// Accepts the same `liveCells` formats as `step` and returns the final LiveCellIndex.
export const ticks = (liveCells, n) => {
  let s = liveCells;
  // Accept arrays of {x,y} by converting to LiveCellIndex
  try {
    if (Array.isArray(liveCells) && typeof LiveCellIndex.fromCells === 'function') {
      s = LiveCellIndex.fromCells(liveCells);
    }
  } catch (e) {
    // fall through
  }
  const times = Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  for (let i = 0; i < times; i++) s = step(s);
  return s;
};
