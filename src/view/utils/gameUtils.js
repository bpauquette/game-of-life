
// Loads a grid of live cells into the game

const parseCellKey = (key) => {
  const parts = String(key).split(',').map(Number);
  if (parts.length !== 2) return null;
  if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return [parts[0], parts[1]];
};

const normalizeFromForEachCell = (liveCells) => {
  const updates = [];
  liveCells.forEachCell((x, y) => {
    updates.push([x, y]);
  });
  return updates;
};

const normalizeFromMap = (liveCells) =>
  Array.from(liveCells.keys()).map(parseCellKey).filter(Boolean);

const normalizeFromArray = (liveCells) =>
  liveCells.map((cell) => {
    if (Array.isArray(cell)) return cell;
    if (cell && typeof cell === 'object' && typeof cell.x === 'number' && typeof cell.y === 'number') {
      return [cell.x, cell.y];
    }
    return null;
  }).filter(Boolean);

const normalizeFromIterable = (liveCells) =>
  Array.from(liveCells).map((entry) => {
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      return parseCellKey(entry[0]);
    }
    return null;
  }).filter(Boolean);

function normalizeLiveCells(liveCells) {
  if (!liveCells) return [];
  if (typeof liveCells.forEachCell === 'function') {
    return normalizeFromForEachCell(liveCells);
  }
  if (liveCells instanceof Map) {
    return normalizeFromMap(liveCells);
  }
  if (Array.isArray(liveCells)) {
    return normalizeFromArray(liveCells);
  }
  return normalizeFromIterable(liveCells);
}


export function loadGridIntoGame(gameRef, liveCells, options = {}) {
  if (!gameRef?.current || !liveCells) return;
  const model = gameRef.current.model;
  if (!model || typeof model.setCellsAliveBulk !== 'function') return;
  const { replace = true } = options;
  const updates = normalizeLiveCells(liveCells);
  if (replace && typeof model.clearModel === 'function') {
    try {
      model.clearModel();
    } catch (e) {
      console.error('loadGridIntoGame: clearModel failed', e);
    }
  }
  if (updates.length > 0) {
    model.setCellsAliveBulk(updates);
  }
}

// Place a rotated shape into the game at the correct location
// This function is inferred from usage in GameOfLifeApp.js
export function rotateAndApply(gameRef, shapeManager, rotatedShape, index) {
  if (!gameRef?.current || !rotatedShape) return;
  const model = gameRef.current.model;
  if (!model || typeof model.placeShape !== 'function') return;
  // Try to get the placement position from the shapeManager or fallback
  let x = 0, y = 0;
  if (shapeManager && typeof shapeManager.getPlacementPosition === 'function') {
    const pos = shapeManager.getPlacementPosition(index, rotatedShape);
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      x = pos.x;
      y = pos.y;
    }
  }
  // Place the rotated shape at the computed position
  model.placeShape(x, y, rotatedShape);
  // Optionally update the shape manager's state
  if (shapeManager && typeof shapeManager.updateShapeState === 'function') {
    shapeManager.updateShapeState(rotatedShape);
  }
}
