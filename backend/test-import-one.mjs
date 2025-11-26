#!/usr/bin/env node
// Test import one RLE file
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseRLE } from './src/rleParser.js';
import { SQLiteDatabase } from './src/sqlite-db.js';
import { generateShapeSignature } from './src/shapeSignature.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node test-import-one.mjs <file>');
  process.exit(1);
}

const filePath = path.resolve(file);

async function main() {
  console.log(`Testing import of ${filePath}`);
  const db = new SQLiteDatabase();
  await db.connect();

  try {
    const rleText = await fs.readFile(filePath, 'utf8');
    console.log('Read RLE text');
    const shape = parseRLE(rleText);
    console.log(`Parsed shape: ${shape.width}x${shape.height}, cells: ${shape.cells.length}`);
    if (!shape.cells || shape.cells.length === 0) {
      console.log('Skipping: no cells');
      return;
    }

    if (shape.width > 32676 || shape.height > 32676) {
      console.log('Skipping: oversized');
      return;
    }

    const name = path.basename(file, '.rle');
    const dbShape = {
      id: 'rle-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 46),
      name: name,
      description: '',
      rule: 'B3/S23',
      width: shape.width,
      height: shape.height,
      cells: shape.cells,
      rleText: rleText,
      userId: 'system',
      period: 1,
      population: shape.cells.length
    };

    console.log('Adding shape...');
    const result = await db.addShape(dbShape);
    if (result && result.duplicate) {
      console.log('Duplicate detected');
    } else {
      console.log('Shape added');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();