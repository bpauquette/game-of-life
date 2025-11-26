import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako'; // For compressing cells JSON

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compress cells array to save space
const compressCells = (cells) => {
  if (!cells || cells.length === 0) return null;
  const json = JSON.stringify(cells);
  const compressed = pako.deflate(json);
  return compressed;
};

// Decompress cells array
const decompressCells = (compressed) => {
  if (!compressed) return null;
  try {
    const decompressed = pako.inflate(compressed, { to: 'string' });
    return JSON.parse(decompressed);
  } catch (e) {
    return null;
  }
};

// Create slug from name
const createSlug = (name) => {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Extract period from pattern name (basic heuristic)
const extractPeriod = (name, meta) => {
  if (!name) return 1;

  // Look for p\d+ in name
  const periodMatch = name.match(/p(\d+)/i);
  if (periodMatch) return parseInt(periodMatch[1]);

  // Check meta comments for period info
  if (meta?.comments) {
    for (const comment of meta.comments) {
      const metaPeriod = comment.match(/period[:\s]+(\d+)/i);
      if (metaPeriod) return parseInt(metaPeriod[1]);
    }
  }

  return 1; // Default to still life
};

// Extract speed from name (basic heuristic)
const extractSpeed = (name) => {
  if (!name) return null;

  // Look for c/\d+ patterns
  const speedMatch = name.match(/(\d+)c\/(\d+)/i);
  if (speedMatch) return `${speedMatch[1]}c/${speedMatch[2]}`;

  return null;
};

const migrateShapes = async () => {
  console.log('Starting migration from JSON to SQLite...');

  // Open SQLite database
  const dbPath = path.resolve(__dirname, '..', 'data', 'shapes.db');
  console.log('Database path:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  console.log('Creating tables...');
  const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);

  // If DB already contains shapes, skip migration
  const existing = await db.get('SELECT COUNT(*) as count FROM shapes');
  if (existing && existing.count > 0) {
    console.log(`Database already contains ${existing.count} shapes — skipping migration.`);
    await db.close();
    return;
  }

  // Load existing shapes from JSON
  console.log('Loading existing shapes from JSON...');
  const shapesPath = path.resolve(__dirname, '..', 'data', 'shapes.json');
  if (!fs.existsSync(shapesPath)) {
    console.warn('No shapes.json found at', shapesPath, '- nothing to migrate');
    await db.close();
    return;
  }
  const shapesData = JSON.parse(fs.readFileSync(shapesPath, 'utf8'));

  console.log(`Found ${shapesData.length} shapes to migrate`);

  // Migrate shapes in batches
  const batchSize = 100;
  let migrated = 0;

  for (let i = 0; i < shapesData.length; i += batchSize) {
    const batch = shapesData.slice(i, i + batchSize);
    console.log(`Migrating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shapesData.length / batchSize)}...`);

    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO shapes (
        id, name, slug, description, rule, width, height, population,
        period, speed, user_id, rle_text, cells_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const shape of batch) {
      const slug = createSlug(shape.name);
      const period = extractPeriod(shape.name, shape.meta);
      const speed = extractSpeed(shape.name);
      const compressedCells = compressCells(shape.cells);

      // Store original RLE if available, otherwise reconstruct
      const rleText = shape.meta?.originalHeader ?
        `${shape.meta.originalHeader}\n${shape.rle_body || ''}` :
        null;

      await stmt.run(
        shape.id,
        shape.name,
        slug,
        shape.description || shape.meta?.comments?.join('\n'),
        shape.rule || 'B3/S23',
        shape.width,
        shape.height,
        shape.cells?.length || 0,
        period,
        speed,
        shape.userId || 'system',
        rleText,
        compressedCells,
        shape.createdAt || new Date().toISOString(),
        shape.updatedAt || new Date().toISOString()
      );
    }

    await stmt.finalize();
    migrated += batch.length;
  }

  // Create some default tags
  console.log('Creating default tags...');
  const defaultTags = [
    { name: 'still-life', description: 'Patterns that do not change over time' },
    { name: 'oscillator', description: 'Patterns that repeat periodically' },
    { name: 'spaceship', description: 'Patterns that move across the grid' },
    { name: 'methuselah', description: 'Patterns that evolve for a long time before stabilizing' },
    { name: 'gun', description: 'Patterns that produce spaceships' },
    { name: 'puffer', description: 'Patterns that move and leave debris' },
    { name: 'wickstretcher', description: 'Patterns that stretch wicks' },
    { name: 'fuse', description: 'Patterns that burn down' },
    { name: 'infinite-growth', description: 'Patterns that grow without bound' }
  ];

  for (const tag of defaultTags) {
    await db.run(
      'INSERT OR IGNORE INTO tags (name, description) VALUES (?, ?)',
      tag.name,
      tag.description
    );
  }

  // Basic tag assignment based on pattern characteristics
  console.log('Assigning basic tags...');
  await db.run(`
    INSERT OR IGNORE INTO shape_tags (shape_id, tag_id)
    SELECT s.id, t.id
    FROM shapes s
    CROSS JOIN tags t
    WHERE (t.name = 'still-life' AND s.period = 1)
       OR (t.name = 'oscillator' AND s.period > 1)
       OR (t.name = 'spaceship' AND s.speed IS NOT NULL)
  `);

  console.log(`Migration complete! Migrated ${migrated} shapes.`);
  console.log('Database saved to: data/shapes.db');

  await db.close();
};

// Test query
const testQueries = async () => {
  const db = await open({
    filename: path.join(__dirname, 'data', 'shapes.db'),
    driver: sqlite3.Database
  });

  console.log('\n=== Test Queries ===');

  // Count shapes
  const count = await db.get('SELECT COUNT(*) as count FROM shapes');
  console.log(`Total shapes: ${count.count}`);

  // Sample shapes
  const samples = await db.all('SELECT name, population, period FROM shapes LIMIT 5');
  console.log('Sample shapes:', samples);

  // Statistics
  const stats = await db.get(`
    SELECT
      COUNT(*) as total,
      AVG(population) as avg_pop,
      MAX(population) as max_pop,
      COUNT(CASE WHEN period = 1 THEN 1 END) as still_lives,
      COUNT(CASE WHEN period > 1 THEN 1 END) as oscillators
    FROM shapes
  `);
  console.log('Statistics:', stats);

  await db.close();
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateShapes()
    .then(() => testQueries())
    .catch(console.error);
}

export { migrateShapes, testQueries };