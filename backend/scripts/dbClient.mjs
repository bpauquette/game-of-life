import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');

export function openDb() {
  // returns a better-sqlite3 Database instance
  return new Database(DB_PATH);
}

export function getAllShapes() {
  const db = openDb();
  try {
    const rows = db.prepare('SELECT * FROM shapes WHERE is_active = 1').all();
    return (rows || []).map(r => {
      const out = { ...r };
      try {
        if (r.cells_json) {
          const input = Buffer.isBuffer(r.cells_json) ? r.cells_json : Buffer.from(r.cells_json);
          try {
            const decompressed = pako.inflate(new Uint8Array(input), { to: 'string' });
            out.cells = JSON.parse(decompressed);
          } catch (e) {
            out.cells = null;
          }
        }
      } catch (e) {
        out.cells = out.cells || null;
      }
      return out;
    });
  } finally {
    try { db.close(); } catch (e) { /* ignore */ }
  }
}

export function writeShapes(shapes) {
  if (!Array.isArray(shapes)) throw new Error('shapes must be array');
  const db = openDb();
  const sql = `INSERT OR REPLACE INTO shapes (
      id, name, description, slug, rule, width, height, population,
      period, speed, user_id, source_url, rle_text, cells_json, signature,
      created_at, updated_at, is_active, public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const insert = db.prepare(sql);
  const insertTxn = db.transaction((list) => {
    for (const shape of list) {
      const compressed = (shape.cells && shape.cells.length) ? Buffer.from(pako.deflate(JSON.stringify(shape.cells))) : null;
      const population = Number.isFinite(Number(shape.population)) ? Number(shape.population) : (Array.isArray(shape.cells) ? shape.cells.length : 0);
      insert.run([
        shape.id,
        shape.name || null,
        shape.description || null,
        shape.slug || null,
        shape.rule || 'B3/S23',
        shape.width || 0,
        shape.height || 0,
        population,
        shape.period || 1,
        shape.speed || null,
        shape.userId || shape.user_id || 'system',
        shape.sourceUrl || shape.source_url || null,
        shape.rleText || shape.rle_text || null,
        compressed,
        shape.signature || null,
        shape.createdAt || shape.created_at || new Date().toISOString(),
        shape.updatedAt || shape.updated_at || new Date().toISOString(),
        typeof shape.is_active === 'number' ? shape.is_active : (shape.isActive || 1),
        typeof shape.public === 'number' ? shape.public : (shape.public ? 1 : 0)
      ]);
    }
  });

  try {
    insertTxn(shapes);
  } finally {
    try { db.close(); } catch (e) { /* ignore */ }
  }
}

export function updateShape(id, fields = {}) {
  const db = openDb();
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
    const res = db.prepare(sql).run(...params);
    return res && res.changes > 0;
  } finally {
    try { db.close(); } catch (e) { /* ignore */ }
  }
}
