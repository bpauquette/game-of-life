#!/usr/bin/env node
// Script to find shapes with duplicate names but different signatures
import { SQLiteDatabase } from '../src/sqlite-db.js';

async function main() {
  const db = new SQLiteDatabase();
  await db.connect();

  // Get all shapes
  const shapes = await db.db.all("SELECT id, name, signature, rle_text FROM shapes WHERE is_active = 1 ORDER BY name");

  const nameMap = new Map();

  for (const shape of shapes) {
    if (!nameMap.has(shape.name)) {
      nameMap.set(shape.name, []);
    }
    nameMap.get(shape.name).push(shape);
  }

  const duplicates = [];

  for (const [name, list] of nameMap) {
    if (list.length > 1) {
      const sigs = new Set(list.map(s => s.signature).filter(Boolean));
      if (sigs.size > 1) {
        duplicates.push({ name, shapes: list });
      }
    }
  }

  console.log(`Found ${duplicates.length} names with duplicate entries and different signatures:`);
  for (const dup of duplicates) {
    console.log(`\nName: ${dup.name}`);
    for (const shape of dup.shapes) {
      console.log(`  ID: ${shape.id}, Signature: ${shape.signature?.slice(0,16) || 'null'}..., RLE length: ${shape.rle_text?.length || 0}`);
    }
  }

  process.exit(0);
}

await main();