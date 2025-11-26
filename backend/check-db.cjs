const Database = require('better-sqlite3');
const db = new Database('./data/shapes.db');
try {
  const rows = db.prepare("SELECT id, name, description FROM shapes WHERE description IS NOT NULL AND description != '' LIMIT 3").all();
  console.log(JSON.stringify(rows, null, 2));
} finally {
  try { db.close(); } catch (e) {}
}