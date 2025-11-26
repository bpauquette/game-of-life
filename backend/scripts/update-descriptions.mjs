#!/usr/bin/env node
// Update descriptions for shapes in DB
import { SQLiteDatabase } from '../src/sqlite-db.js';
import { parseRLE, parseCells } from '../src/rleParser.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const db = new SQLiteDatabase();
await db.connect();

const shapes = await db.db.all("SELECT id, name, rle_text FROM shapes WHERE (description IS NULL OR description = '') AND is_active = 1");

console.log(`Found ${shapes.length} shapes with empty description`);

for (const shape of shapes) {
  let description = '';
  if (shape.rle_text) {
    try {
      const parsed = parseRLE(shape.rle_text);
      description = parsed.meta?.comments?.join(' ') || '';
    } catch (e) {
      console.log(`Error parsing RLE for ${shape.name}: ${e.message}`);
    }
  } else {
    // Try to find .cells file
    const cellsPath = path.join('all', shape.name + '.cells');
    try {
      const cellsText = await fs.readFile(cellsPath, 'utf8');
      const parsed = parseCells(cellsText);
      description = parsed.meta?.comments?.join(' ') || '';
    } catch (e) {
      // No file or error
    }
  }
  if (description) {
    await db.db.run("UPDATE shapes SET description = ? WHERE id = ?", description, shape.id);
    console.log(`Updated ${shape.name}: ${description.slice(0,50)}...`);
  }
}

console.log('Done');
process.exit(0);