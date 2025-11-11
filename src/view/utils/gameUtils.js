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
    gameRef.current.model.setCellsAliveBulk(Array.from(liveCells));
  }
}
