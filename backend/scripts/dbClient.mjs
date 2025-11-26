import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');

export async function openDb() {
  return open({ filename: DB_PATH, driver: sqlite3.Database });
}

export async function getAllShapes() {
  const db = await openDb();
  try {
    const rows = await db.all('SELECT * FROM shapes WHERE is_active = 1');
    return rows || [];
  } finally {
    await db.close();
  }
}

export async function updateShape(id, fields = {}) {
  const db = await openDb();
  try {
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
    if (sets.length === 0) return false;
    params.push(id);
    const sql = `UPDATE shapes SET ${sets.join(', ')} WHERE id = ?`;
    const res = await db.run(sql, params);
    return res && res.changes > 0;
  } finally {
    await db.close();
  }
}
