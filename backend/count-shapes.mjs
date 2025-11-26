import { SQLiteDatabase } from './src/sqlite-db.js';

async function countShapes() {
  console.log('Starting count...');
  const db = new SQLiteDatabase();
  console.log('Connecting...');
  await db.connect();
  console.log('Listing shapes...');
  const shapes = await db.listShapes();
  console.log(`Total shapes in database: ${shapes.length}`);
}

countShapes().catch(console.error);