import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRLE, parseCells } from '../src/rleParser.js';
import db from '../src/db.js';
import { generateThumbnailsForShape } from '../src/thumbnailGenerator.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing all pattern files
const ALL_DIR = path.join(__dirname, '..', 'all');

const makeId = () => uuidv4();

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 200);

const ensureUniqueName = async (name) => {
  let candidate = name;
  let counter = 1;
  while (await db.getShapeByName(candidate)) {
    candidate = `${name} ${counter}`;
    counter++;
  }
  return candidate;
};

const parsePatternFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.rle') {
    return parseRLE(content);
  } else if (ext === '.cells') {
    return parseCells(content);
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }
};

const importPattern = async (filePath, index, total) => {
  try {
    const fileName = path.basename(filePath, path.extname(filePath));
    console.log(`[${index + 1}/${total}] Processing ${fileName}...`);

    const shape = parsePatternFile(filePath);
    shape.id = makeId();

    // Use parsed name or derive from filename
    if (!shape.name || shape.name === 'unnamed') {
      shape.name = fileName.replace(/_/g, ' ').replace(/-/g, ' ');
    }

    shape.name = await ensureUniqueName(shape.name);

    // Add metadata
    shape.userId = 'system'; // Mark as system-imported
    shape.createdAt = new Date().toISOString();
    shape.updatedAt = new Date().toISOString();

    console.log(`  ✓ Processed ${shape.name} (${shape.cells.length} cells)`);
    return shape;

  } catch (error) {
    console.error(`  ✗ Failed to process ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
};

const main = async () => {
  console.log('Starting bulk import of all patterns...\n');

  // Get all .rle and .cells files
  const files = fs.readdirSync(ALL_DIR)
    .filter(file => file.endsWith('.rle') || file.endsWith('.cells'))
    .map(file => path.join(ALL_DIR, file))
    .sort(); // Sort for consistent ordering

  console.log(`Found ${files.length} pattern files to import\n`);

  if (files.length === 0) {
    console.log('No pattern files found. Exiting.');
    return;
  }

  const allShapes = [];
  const results = {
    total: files.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  // First pass: parse all files
  console.log('Phase 1: Parsing all pattern files...');
  for (let i = 0; i < files.length; i++) {
    const result = await importPattern(files[i], i, files.length);
    if (result) {
      allShapes.push(result);
      results.successful++;
    } else {
      results.failed++;
    }
  }

  console.log(`\nPhase 1 complete: ${results.successful} parsed successfully, ${results.failed} failed\n`);

  // Second pass: generate thumbnails in batches
  console.log('Phase 2: Generating thumbnails...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < allShapes.length; i += BATCH_SIZE) {
    const batch = allShapes.slice(i, i + BATCH_SIZE);
    console.log(`Generating thumbnails for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allShapes.length / BATCH_SIZE)} (${batch.length} shapes)...`);

    for (const shape of batch) {
      try {
        await generateThumbnailsForShape(shape);
      } catch (error) {
        console.error(`  Failed to generate thumbnail for ${shape.name}: ${error.message}`);
      }
    }
  }

  console.log('\nPhase 2 complete: thumbnails generated\n');

  // Third pass: save all shapes to database
  console.log('Phase 3: Saving to database...');
  try {
    // Read existing shapes
    const existingShapes = await db.listShapes();

    // Combine existing and new shapes
    const combinedShapes = [...existingShapes, ...allShapes];

    // Write all at once
    await db.writeDb(combinedShapes);

    console.log(`✓ Saved ${allShapes.length} new shapes to database`);
    console.log(`Total shapes in database: ${combinedShapes.length}`);

  } catch (error) {
    console.error(`✗ Failed to save to database: ${error.message}`);
    return;
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total files: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);

  console.log('\nBulk import completed!');
};

main().catch(console.error);