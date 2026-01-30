
// Loads a grid of live cells into the game

function normalizeLiveCells(liveCells) {
  if (!liveCells) return [];
  if (typeof liveCells.forEachCell === 'function') {
    const updates = [];
    liveCells.forEachCell((x, y) => {
      updates.push([x, y]);
    });
    return updates;
  }
  if (liveCells instanceof Map) {
    return Array.from(liveCells.keys()).map(key => {
      const parts = String(key).split(',').map(Number);
      if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        return [parts[0], parts[1]];
      }
      return null;
    }).filter(Boolean);
  }
  if (Array.isArray(liveCells)) {
    return liveCells.map((c) => {
      if (Array.isArray(c)) return c;
      if (c && typeof c === 'object' && typeof c.x === 'number' && typeof c.y === 'number') return [c.x, c.y];
      return null;
    }).filter(Boolean);
  }
  // Fallback: try to coerce iterable entries
  return Array.from(liveCells).map((e) => {
    if (Array.isArray(e) && typeof e[0] === 'string') {
      const parts = e[0].split(',').map(Number);
      if (parts.length === 2) return [parts[0], parts[1]];
    }
    return null;
  }).filter(Boolean);
}


export function loadGridIntoGame(gameRef, liveCells) {
  if (!gameRef?.current || !liveCells) return;
  const model = gameRef.current.model;
  if (!model || typeof model.setCellsAliveBulk !== 'function') return;
  const updates = normalizeLiveCells(liveCells);
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
