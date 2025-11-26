import { SQLiteDatabase } from './src/sqlite-db.js';

async function listNamesAndSignatures() {
  const db = new SQLiteDatabase();
  await db.connect();

  const rows = await db.db.all('SELECT name, signature FROM shapes WHERE is_active = 1 ORDER BY name');

  console.log('Name -> Signature');
  console.log('==================');
  for (const row of rows) {
    console.log(`${row.name} -> ${row.signature}`);
  }

  console.log(`\nTotal shapes: ${rows.length}`);
}

listNamesAndSignatures().catch(console.error);