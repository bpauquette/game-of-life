import { SQLiteDatabase } from './src/sqlite-db.js';

const db = new SQLiteDatabase();
await db.connect();

const info = await db.db.all("PRAGMA table_info(shapes)");
console.log(info);

process.exit(0);