#!/usr/bin/env node
// Import lexicon.txt to database using centralized parser with signature deduplication
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexiconFile } from '../src/lexiconParser.js';
import { SQLiteDatabase } from '../src/sqlite-db.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_DIR = path.join(__dirname, '..', 'lexicon');

async function main() {
  console.log('Starting import...');
  const db = new SQLiteDatabase();
  await db.connect();
  console.log('DB connected');

  // Clear existing shapes
  await db.clearShapes();
  console.log('DB cleared');

  // Get all .txt files in lexicon directory
  const files = await fs.readdir(LEXICON_DIR);
  const txtFiles = files.filter(f => f.endsWith('.txt'));
  console.log(`Found ${txtFiles.length} .txt files: ${txtFiles.join(', ')}`);

  let totalEntries = 0;
  let totalShapes = 0;
  let totalSkippedNoData = 0;

  for (const file of txtFiles) {
    const filePath = path.join(LEXICON_DIR, file);
    console.log(`Parsing ${file}...`);
    const entries = await parseLexiconFile(filePath);
    totalEntries += entries.length;
    const shapes = entries.filter(e => e.type === 'pattern' && e.cells && e.cells.length > 0);
    totalShapes += shapes.length;
    const skippedNoData = entries.filter(e => e.type === 'pattern' && (!e.cells || e.cells.length === 0));
    totalSkippedNoData += skippedNoData.length;

    console.log(`  ${file}: ${entries.length} entries, ${shapes.length} shapes with data, ${skippedNoData.length} without data`);

    // Import shapes
    for (const shape of shapes) {
      try {
        // Skip overly large shapes (>32676x32676 can cause issues)
        if (shape.width > 32676 || shape.height > 32676) {
          console.log(`Skipping oversized shape: ${shape.name} (${shape.width}x${shape.height})`);
          continue;
        }

        // For .rle named shapes, check existing by name and signature
        if (shape.name && shape.name.endsWith('.rle')) {
          const existing = await db.getShapeByName(shape.name);
          if (existing) {
            const existingSig = existing.rleText ? generateShapeSignature(existing.rleText) : null;
            const newSig = shape.rleText ? generateShapeSignature(shape.rleText) : null;
            if (existingSig && newSig && existingSig === newSig) {
              console.log(`Skipping duplicate .rle shape: ${shape.name}`);
              continue;
            } else {
              console.log(`Name conflict for .rle shape: ${shape.name} (different signatures)`);
              continue;
            }
          }
        }

        // Prepare shape for database
        const dbShape = {
          id: uuidv4(),
          name: shape.name,
          description: shape.description,
          rule: 'B3/S23',
          width: shape.width,
          height: shape.height,
          cells: shape.cells,
          rleText: shape.rleText,
          userId: 'system',
          period: shape.period || 1,
          population: shape.cellCount
        };

        await db.addShape(dbShape);
      } catch (err) {
        if (err.message.includes('Duplicate shape detected')) {
          console.log(`Duplicate shape skipped: ${shape.name}`);
        } else {
          console.error(`Error importing ${shape.name}:`, err.message);
        }
      }
    }
  }

  console.log(`\nTotal from all files:`);
  console.log(`- Entries parsed: ${totalEntries}`);
  console.log(`- Shapes with data: ${totalShapes}`);
  console.log(`- Shapes without data: ${totalSkippedNoData}`);
}

await main();
