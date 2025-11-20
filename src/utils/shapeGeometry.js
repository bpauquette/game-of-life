// Geometry helpers for Game of Life shapes. Keeps cell coordinate math in one place
// so placement, previews, and capture behaviors stay consistent.

function coerceCells(shapeOrCells) {
  if (!shapeOrCells) return [];
  if (Array.isArray(shapeOrCells)) return shapeOrCells;
  if (Array.isArray(shapeOrCells.cells)) return shapeOrCells.cells;
  if (Array.isArray(shapeOrCells.pattern)) return shapeOrCells.pattern;
  return [];
}

function toCoords(cell) {
  if (!cell) return { x: 0, y: 0 };
  if (Array.isArray(cell)) {
    const x = Number(cell[0]);
    const y = Number(cell[1]);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0
    };
  }
  const x = Number(cell.x);
  const y = Number(cell.y);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

export function getShapeCells(shapeOrCells) {
  return coerceCells(shapeOrCells);
}

export function getNormalizedShapeCells(shapeOrCells) {
  return coerceCells(shapeOrCells).map(toCoords);
}

export function getShapeBounds(shapeOrCells) {
  const cells = getNormalizedShapeCells(shapeOrCells);
  if (!cells.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = cells[0].x;
  let maxX = cells[0].x;
  let minY = cells[0].y;
  let maxY = cells[0].y;
  for (let i = 1; i < cells.length; i++) {
    const { x, y } = cells[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

export function getShapeCenter(shapeOrCells) {
  const { minX, maxX, minY, maxY } = getShapeBounds(shapeOrCells);
  return {
    x: Math.floor((minX + maxX) / 2),
    y: Math.floor((minY + maxY) / 2)
  };
}

export function getCenteredOrigin(target, shapeOrCells) {
  const center = getShapeCenter(shapeOrCells);
  return {
    x: target.x - center.x,
    y: target.y - center.y
  };
}

export function translateCells(shapeOrCells, deltaX, deltaY) {
  const cells = getNormalizedShapeCells(shapeOrCells);
  return cells.map(({ x, y }) => ({ x: x + deltaX, y: y + deltaY }));
}
