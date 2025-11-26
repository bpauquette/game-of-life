const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/shapes.db');
db.all('SELECT id, name, description FROM shapes WHERE description IS NOT NULL AND description != "" LIMIT 3', (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});