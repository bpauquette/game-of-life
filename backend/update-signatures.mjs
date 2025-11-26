// Generate RLE from cells
function encodeRLE(cells) {
  if (!cells || cells.length === 0) return '';

  // Find bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Create grid
  const grid = Array.from({ length: height }, () => Array(width).fill(false));
  for (const cell of cells) {
    grid[cell.y - minY][cell.x - minX] = true;
  }

  // Encode to RLE
  let rle = `x = ${width}, y = ${height}, rule = B3/S23\n`;
  for (let y = 0; y < height; y++) {
    let line = '';
    let count = 1;
    for (let x = 0; x < width; x++) {
      const current = grid[y][x];
      const next = x < width - 1 ? grid[y][x + 1] : null;
      if (current === next) {
        count++;
      } else {
        if (count > 1) line += count;
        line += current ? 'o' : 'b';
        count = 1;
      }
    }
    rle += line + '$';
  }
  rle = rle.slice(0, -1) + '!';
  return rle;
}

import { SQLiteDatabase } from './src/sqlite-db.js';
import { generateShapeSignature } from './src/shapeSignature.js';
import pako from 'pako';

// Decompress cells array
function decompressCells(cellsBlob) {
  if (!cellsBlob) return null;
  try {
    const decompressed = pako.inflate(new Uint8Array(cellsBlob), { to: 'string' });
    return JSON.parse(decompressed);
  } catch (err) {
    console.error('Error decompressing cells:', err.message);
    return null;
  }
}

async function updateSignatures() {
  const db = new SQLiteDatabase();
  await db.connect();

  const shapes = await db.db.all('SELECT id, name, cells_json FROM shapes WHERE signature IS NULL AND is_active = 1');

  console.log(`Updating signatures for ${shapes.length} shapes...`);

  for (const shape of shapes) {
    try {
      const cellsBlob = shape.cells_json;
      if (!cellsBlob) continue;

      const cells = decompressCells(cellsBlob);
      if (!cells || cells.length === 0) continue;

      const rleText = encodeRLE(cells);
      const signature = generateShapeSignature(rleText);

      await db.db.run('UPDATE shapes SET rle_text = ?, signature = ? WHERE id = ?', rleText, signature, shape.id);

      console.log(`Updated ${shape.name}: ${signature.slice(0, 16)}...`);
    } catch (err) {
      console.error(`Error updating ${shape.name}:`, err.message);
    }
  }

  console.log('Done updating signatures.');
}

updateSignatures().catch(console.error);