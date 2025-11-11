import { rotateShape } from '../../model/shapeTransforms';

// Rotates a shape and applies it to the game
export function rotateAndApply(gameRef, shapeManager, rotatedShape, index) {
  if (!gameRef?.current || !rotatedShape) return;
  // Example: apply rotated shape to the game
  // You may want to use shapeManager or gameRef.current.model
  if (gameRef.current.model && rotatedShape.cells) {
    gameRef.current.model.setCellsAliveBulk(rotatedShape.cells);
    if (typeof shapeManager?.selectShape === 'function') {
      shapeManager.selectShape(rotatedShape);
    }
  }
}

// Loads a grid of live cells into the game
export function loadGridIntoGame(gameRef, liveCells) {
  if (!gameRef?.current || !liveCells) return;
  if (gameRef.current.model && typeof gameRef.current.model.setCellsAliveBulk === 'function') {
    // liveCells may be provided as a Map (key: "x,y" -> true) or as an array of
    // serialized cells ({x,y}) coming from the backend. Normalize into a
    // bulk-update array that GameModel.setCellsAliveBulk understands.
    let updates = [];
    if (liveCells instanceof Map) {
      for (const key of liveCells.keys()) {
        const parts = String(key).split(',').map(Number);
        if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          updates.push([parts[0], parts[1]]);
        }
      }
    } else if (Array.isArray(liveCells)) {
      // assume already serialized as [{x,y}, ...] or [[x,y], ...]
      updates = liveCells.map((c) => {
        if (Array.isArray(c)) return c;
        if (c && typeof c === 'object' && typeof c.x === 'number' && typeof c.y === 'number') return [c.x, c.y];
        return null;
      }).filter(Boolean);
    } else {
      // Fallback: try to coerce iterable entries
      try {
        updates = Array.from(liveCells).map((e) => {
          // e may be [key, value] where key is 'x,y'
          if (Array.isArray(e) && typeof e[0] === 'string') {
            const parts = e[0].split(',').map(Number);
            if (parts.length === 2) return [parts[0], parts[1]];
          }
          return null;
        }).filter(Boolean);
      } catch (err) {
        updates = [];
      }
    }

    if (updates.length > 0) {
      gameRef.current.model.setCellsAliveBulk(updates);
    }
  }
}
