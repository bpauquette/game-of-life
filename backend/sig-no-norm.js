import crypto from 'crypto';

function generateShapeSignatureFromCellsNoNormalize(cells) {
  if (!Array.isArray(cells)) {
    throw new Error('Invalid cells input');
  }

  if (cells.length === 0) {
    return crypto.createHash('sha256').update('empty').digest('hex');
  }

  const normalizedCells = cells.map(c => ({x: c.x, y: c.y})); // no normalize

  normalizedCells.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const cellString = normalizedCells.map(c => `${c.x},${c.y}`).join(';');

  return crypto.createHash('sha256').update(cellString).digest('hex');
}

import { readFileSync } from 'fs';
import { parseCells } from './src/rleParser.js';

const cellsText = readFileSync('all/101.cells', 'utf8');
const cellsParsed = parseCells(cellsText);

const sigNoNorm = generateShapeSignatureFromCellsNoNormalize(cellsParsed.cells);
console.log('Signature without normalization:', sigNoNorm);