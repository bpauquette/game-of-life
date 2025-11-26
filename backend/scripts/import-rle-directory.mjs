#!/usr/bin/env node
// Import RLE files from a directory
import fs from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRLE, parseCells } from '../src/rleParser.js';
import { SQLiteDatabase } from '../src/sqlite-db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateShapeSignature } from '../src/shapeSignature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECTORY = path.join(__dirname, '..', 'all');

async function main() {
  console.log('Starting main...');
  console.log(`process.argv: ${process.argv.join(', ')}`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`CWD: ${process.cwd()}`);
  console.log(`Resolved directory: ${path.resolve(DIRECTORY)}`);
  const logFile = 'import-rle.log';
  const log = (msg) => {
    console.log(msg);
    fs.appendFile(logFile, msg + '\n');
  };
  const db = new SQLiteDatabase();
  try {
    await db.connect();
    console.log('DB connected');
  } catch (err) {
    console.error('DB connect failed:', err.message);
    return;
  }

  // Get all files (not just .rle)
  let files;
  try {
    files = await fs.readdir(DIRECTORY);
    console.log(`All files in directory: ${files.slice(0, 10).join(', ')}`);
  } catch (err) {
    console.error(`Directory not found: ${DIRECTORY}`);
    return;
  }
  const allFiles = files.filter(f => !statSync(path.join(DIRECTORY, f)).isDirectory()); // exclude directories
  console.log(`Filtered files (excluding directories): ${allFiles.slice(0, 10).join(', ')}`);
  console.log(`Found ${allFiles.length} files`);

  let imported = 0;
  let skippedDuplicates = 0;
  let skippedNoCells = 0;
  let skippedOversized = 0;
  let errors = 0;

  let totalAttempted = 0;

  for (const file of allFiles) {
    totalAttempted++;
    console.log(`Attempting file ${totalAttempted}/${allFiles.length}: ${file}`);
    log(`Processing ${file}...`);

    const filePath = path.join(DIRECTORY, file);
    let rleText;
    try {
      rleText = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      console.log(`Error reading file ${file}: ${err.message}`);
      errors++;
      continue;
    }

    let shape;
    try {
      if (file.endsWith('.cells')) {
        shape = parseCells(rleText);
      } else {
        shape = parseRLE(rleText);
      }
    } catch (err) {
      console.log(`Error parsing ${file}: ${err.message}`);
      errors++;
      continue;
    }
    if (!shape.cells || shape.cells.length === 0) {
      console.log(`Skipping ${file}: no cells`);
      log(`Skipping ${file}: no cells`);
      skippedNoCells++;
      continue;
    }

    // Skip overly large shapes
    if (shape.width > 32676 || shape.height > 32676) {
      console.log(`Skipping oversized shape: ${file} (${shape.width}x${shape.height})`);
      log(`Skipping oversized shape: ${file} (${shape.width}x${shape.height})`);
      skippedOversized++;
      continue;
    }

    // Prepare shape for database
    const name = path.parse(file).name; // base name without extension
    const dbShape = {
      id: uuidv4(),
      name: name,
      description: shape.meta?.comments?.join(' ') || '',
      rule: 'B3/S23',
      width: shape.width,
      height: shape.height,
      cells: shape.cells,
      rleText: rleText,
      userId: 'system',
      period: 1,
      population: shape.cells.length
    };

    const signature = 'not needed'; // generateShapeSignatureFromCells(shape.cells);
    console.log(`Processing ${name}...`);

    let result;
    try {
      result = await db.addShape(dbShape);
    } catch (err) {
      console.log(`Error adding shape ${name}: ${err.message}`);
      errors++;
      continue;
    }
    if (result.duplicate) {
      console.log(`Duplicate of existing shape: ${result.existingShape.name} (id: ${result.existingShape.id})`);
      log(`Duplicate shape skipped: ${name} (matches ${result.existingShape.name})`);
      skippedDuplicates++;
    } else {
      imported++;
      log(`Imported: ${name}`);
    }
  }

  log(`\nImport complete:`);
  log(`- Total attempted: ${totalAttempted}`);
  log(`- Imported: ${imported}`);
  log(`- Skipped duplicates: ${skippedDuplicates}`);
  log(`- Skipped no cells: ${skippedNoCells}`);
  log(`- Skipped oversized: ${skippedOversized}`);
  log(`- Total skipped: ${skippedDuplicates + skippedNoCells + skippedOversized}`);
  log(`- Errors: ${errors}`);

  console.log(`\nImport complete:`);
  console.log(`- Total attempted: ${totalAttempted}`);
  console.log(`- Imported: ${imported}`);
  console.log(`- Skipped duplicates: ${skippedDuplicates}`);
  console.log(`- Skipped no cells: ${skippedNoCells}`);
  console.log(`- Skipped oversized: ${skippedOversized}`);
  console.log(`- Total skipped: ${skippedDuplicates + skippedNoCells + skippedOversized}`);
  console.log(`- Errors: ${errors}`);
}

await main();