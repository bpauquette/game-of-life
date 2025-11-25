#!/usr/bin/env node
// Script to count and delete shapes with names ending in .rle
import { SQLiteDatabase } from '../src/sqlite-db.js';

async function main() {
  const db = new SQLiteDatabase();
  await db.connect();

  // Count shapes with names ending in .rle
  const countResult = await db.db.get("SELECT COUNT(*) as count FROM shapes WHERE name LIKE '%.rle' AND is_active = 1");
  console.log(`Number of shapes with names ending in .rle: ${countResult.count}`);

  // Delete them (set inactive)
  const deleteResult = await db.db.run("UPDATE shapes SET is_active = 0 WHERE name LIKE '%.rle' AND is_active = 1");
  console.log(`Deleted ${deleteResult.changes} shapes`);

  process.exit(0);
}

await main();