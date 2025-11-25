import crypto from 'crypto';
import { parseRLE } from './rleParser.js';

/**
 * Generates a canonical signature for a shape based on its RLE data.
 * This normalizes the shape to origin and creates a hash for duplicate detection.
 * @param {string} rle - The RLE string of the shape
 * @returns {string} - SHA-256 hash of the normalized cell coordinates
 */
export function generateShapeSignature(rle) {
  if (!rle || typeof rle !== 'string') {
    throw new Error('Invalid RLE input');
  }

  // Parse RLE to cells
  const parsed = parseRLE(rle);
  if (!parsed.cells || !Array.isArray(parsed.cells)) {
    throw new Error('Failed to parse RLE');
  }

  return generateShapeSignatureFromCells(parsed.cells);
}

/**
 * Generates a canonical signature for a shape based on its cell coordinates.
 * @param {Array<{x: number, y: number}>} cells - The cell coordinates
 * @returns {string} - SHA-256 hash of the normalized cell coordinates
 */
export function generateShapeSignatureFromCells(cells) {
  if (!Array.isArray(cells)) {
    throw new Error('Invalid cells input');
  }

  // Normalize: translate to origin
  if (cells.length === 0) {
    return crypto.createHash('sha256').update('empty').digest('hex');
  }

  let minX = Infinity;
  let minY = Infinity;
  for (const cell of cells) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
  }
  const normalizedCells = cells.map(c => ({
    x: c.x - minX,
    y: c.y - minY
  }));

  // Sort for consistent ordering
  normalizedCells.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // Serialize as string
  const cellString = normalizedCells.map(c => `${c.x},${c.y}`).join(';');

  // Hash
  return crypto.createHash('sha256').update(cellString).digest('hex');
}