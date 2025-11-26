const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const pako = require('pako');

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');

async function openDb() {
  return open({ filename: DB_PATH, driver: sqlite3.Database });
}

async function getAllShapes() {
  const db = await openDb();
  try {
    const rows = await db.all('SELECT * FROM shapes WHERE is_active = 1');
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
    await db.close();
  }
}

async function writeShapes(shapes) {
  if (!Array.isArray(shapes)) throw new Error('shapes must be array');
  const db = await openDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    const sql = `INSERT OR REPLACE INTO shapes (
      id, name, description, slug, rule, width, height, population,
      period, speed, user_id, source_url, rle_text, cells_json, signature,
      created_at, updated_at, is_active, public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    for (const shape of shapes) {
      const compressed = (shape.cells && shape.cells.length) ? Buffer.from(pako.deflate(JSON.stringify(shape.cells))) : null;
      const population = Number.isFinite(Number(shape.population)) ? Number(shape.population) : (Array.isArray(shape.cells) ? shape.cells.length : 0);
      await db.run(sql, [
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
    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  } finally {
    await db.close();
  }
}

module.exports = { openDb, getAllShapes, writeShapes };
