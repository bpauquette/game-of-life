import { SQLiteDatabase } from '../src/sqlite-db.js';

const db = new SQLiteDatabase();
await db.connect();

const rows = await db.db.all("SELECT id, name, description FROM shapes WHERE name LIKE '%101%'");
console.log('Shapes with 101 in name:', rows);

await db.db.close();