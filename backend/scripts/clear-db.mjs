import { SQLiteDatabase } from '../src/sqlite-db.js';

const db = new SQLiteDatabase();
await db.connect();

await db.clearShapes();
console.log('DB cleared');

await db.db.close();