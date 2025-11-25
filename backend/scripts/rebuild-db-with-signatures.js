#!/usr/bin/env node
// Rebuild shapes database with signatures to prevent duplicates
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SQLiteDatabase } from '../src/sqlite-db.js';
import { generateShapeSignature } from '../src/shapeSignature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'shapes.db.backup');

async function rebuildDatabase() {
  console.log('Starting database rebuild with signatures...');

  // Backup existing database
  if (fs.existsSync(DB_PATH)) {
    console.log('Backing up existing database...');
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log('Backup created at', BACKUP_PATH);
  }

  // Delete existing database
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  // Create new database instance (this will create tables with signature column)
  const db = new SQLiteDatabase();
  await db.connect();

  console.log('New database created with signature support');

  // Note: You'll need to re-import shapes from your source (lexicon, etc.)
  // The import scripts should now use the new addShape which includes signatures

  console.log('Database rebuild complete. Run your import scripts to populate with deduplicated shapes.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebuildDatabase().catch(err => {
    console.error('Rebuild failed:', err);
    process.exit(1);
  });
}