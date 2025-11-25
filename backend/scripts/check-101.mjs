#!/usr/bin/env node
// Script to check for duplicate shapes with name "101"
import { SQLiteDatabase } from '../src/sqlite-db.js';

async function main() {
  const db = new SQLiteDatabase();
  await db.connect();

  // Get all shapes with name containing "101"
  const shapes = await db.db.all("SELECT id, name, signature, rle_text FROM shapes WHERE name LIKE '%101%' AND is_active = 1");
  console.log(`Found ${shapes.length} shapes with '101' in name:`);
  shapes.forEach(shape => {
    console.log(`ID: ${shape.id}, Name: ${shape.name}, Signature: ${shape.signature.slice(0,16)}..., RLE length: ${shape.rle_text?.length || 0}`);
  });

  // Check for exact name "101"
  const exact = shapes.filter(s => s.name === '101');
  console.log(`\nExact matches for name "101": ${exact.length}`);
  if (exact.length > 1) {
    console.log('Signatures:');
    exact.forEach(s => console.log(`  ${s.signature}`));
  }

  process.exit(0);
}

await main();