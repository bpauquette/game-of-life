import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako';
import { generateShapeSignature } from './shapeSignature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');

// Compress/decompress cells. We store compressed BLOBs as Buffer.
const compressCells = (cells) => {
  if (!cells || (Array.isArray(cells) && cells.length === 0)) return null;
  try {
    const json = JSON.stringify(cells);
    const deflated = pako.deflate(json);
    return Buffer.from(deflated);
  } catch (e) {
    try { console.warn('compressCells failed:', e?.message || e); } catch {}
    return null;
  }
};

const decompressCells = (cellsBlob) => {
  if (!cellsBlob) return null;
  try {
    const input = (Buffer.isBuffer(cellsBlob) || cellsBlob instanceof Uint8Array)
      ? cellsBlob
      : Buffer.from(cellsBlob);
    const decompressed = pako.inflate(new Uint8Array(input), { to: 'string' });
    return JSON.parse(decompressed);
  } catch (e) {
    try { console.warn('decompressCells failed for blob (len=' + (cellsBlob?.length || 0) + '):', e?.message || e); } catch {}
    return null;
  }
};
// file intentionally updated to use better-sqlite3 synchronous API

class SQLiteDatabase {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (this.db) return this.db;

    console.log('Connecting to SQLite database at', DB_PATH);
    // Use better-sqlite3 synchronous driver. Create a DB instance and
    // provide small helper wrappers so the rest of the codebase can continue
    // to call `await db.all(...)` / `await db.get(...)`.
    const d = new Database(DB_PATH);

    // Provide synchronous helpers with the same names used elsewhere.
    d.all = function (sql, ...params) { return this.prepare(sql).all(...params); };
    d.get = function (sql, ...params) { return this.prepare(sql).get(...params); };
    d.run = function (sql, ...params) { return this.prepare(sql).run(...params); };

    this.db = d;

    // Enable WAL mode for better concurrency and reasonable cache size.
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    // cache_size is measured in pages; keep conservative default to avoid OOM
    this.db.exec('PRAGMA cache_size = 20000');

    // Ensure tables and auxiliary structures exist
    await this.ensureSignatureColumn();
    await this.ensureGridsTable();
    await this.ensureFTS();

    console.log('SQLite database connected');
    return this.db;
  }

  async ensureFTS() {
    const db = await this.db;
    try {
      // Create an FTS5 virtual table linked to `shapes` for name/description.
      // Not all SQLite builds include FTS5; this is best-effort.
      await db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS shapes_fts USING fts5(
          name, description, content='shapes', content_rowid='rowid'
        )
      `);

      // Create triggers to keep the FTS table in sync with shapes
      await db.exec(`
        CREATE TRIGGER IF NOT EXISTS shapes_ai AFTER INSERT ON shapes BEGIN
          INSERT INTO shapes_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
        END;
      `);
      await db.exec(`
        CREATE TRIGGER IF NOT EXISTS shapes_ad AFTER DELETE ON shapes BEGIN
          INSERT INTO shapes_fts(shapes_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
        END;
      `);
      await db.exec(`
        CREATE TRIGGER IF NOT EXISTS shapes_au AFTER UPDATE ON shapes BEGIN
          INSERT INTO shapes_fts(shapes_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
          INSERT INTO shapes_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
        END;
      `);
    } catch (err) {
      try { console.warn('FTS setup not available or failed:', err?.message || err); } catch {}
    }
  }

  async ensureSignatureColumn() {
    const db = await this.db;
    try {
      // Ensure table exists
      await db.exec(`
        CREATE TABLE IF NOT EXISTS shapes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT,
          description TEXT,
          rule TEXT DEFAULT 'B3/S23',
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          population INTEGER DEFAULT 0,
          period INTEGER DEFAULT 1,
          speed REAL,
          user_id TEXT DEFAULT 'system',
          source_url TEXT,
          rle_text TEXT,
          cells_json BLOB,
          signature TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `);

      // Check if signature column exists
      const columns = await db.all("PRAGMA table_info(shapes)");
      const hasSignature = columns.some(col => col.name === 'signature');
      const hasDescription = columns.some(col => col.name === 'description');
      const hasPublic = columns.some(col => col.name === 'public');
      
      if (!hasSignature) {
        console.log('Adding signature column to shapes table');
        await db.exec('ALTER TABLE shapes ADD COLUMN signature TEXT UNIQUE');
        console.log('Signature column added');
      }
      if (!hasDescription) {
        console.log('Adding description column to shapes table');
        await db.exec('ALTER TABLE shapes ADD COLUMN description TEXT');
        console.log('Description column added');
      }
      if (!hasPublic) {
        console.log('Adding public column to shapes table');
        await db.exec('ALTER TABLE shapes ADD COLUMN public INTEGER DEFAULT 0');
        console.log('Public column added');
      }
    } catch (err) {
      console.warn('Error ensuring columns:', err.message);
    }
  }

  async ensureGridsTable() {
    const db = await this.db;
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS grids (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          data TEXT NOT NULL,
          user_id TEXT NOT NULL,
          generation INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Grids table ensured');
    } catch (err) {
      console.warn('Error ensuring grids table:', err.message);
    }
  }

  async listShapes() {
    const db = await this.connect();
    const rows = await db.all(`
      SELECT
        id, name, rule, width, height, population,
        period, speed, user_id as userId, source_url as sourceUrl,
        rle_text as rleText, cells_json as cellsBlob,
        created_at as createdAt, updated_at as updatedAt
      FROM shapes
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    // Decompress cells for each shape
    return rows.map(row => ({
      ...row,
      cells: decompressCells(row.cellsBlob)
    }));
  }

  async clearShapes() {
    const db = await this.connect();
    await db.run('DELETE FROM shapes');
    console.log('All shapes cleared from database');
  }

  async getShape(id) {
    const db = await this.connect();
    const row = await db.get(`
      SELECT
        id, name, description, rule, width, height, population,
        period, speed, user_id as userId, source_url as sourceUrl,
        rle_text as rleText, cells_json as cellsBlob,
        created_at as createdAt, updated_at as updatedAt
      FROM shapes
      WHERE id = ? AND is_active = 1
    `, id);

    if (!row) return null;

    const decompressedCells = decompressCells(row.cellsBlob);
    console.log(`[getShape] Shape ${id}: cellsBlob length ${row.cellsBlob?.length}, decompressed:`, decompressedCells?.length || 'null');

    return {
      ...row,
      cells: decompressedCells
    };
  }

  async getShapeByName(name) {
    const db = await this.connect();

    // Try exact match first
    let row = await db.get(`
      SELECT
        id, name, rule, width, height, population,
        period, speed, user_id as userId, source_url as sourceUrl,
        rle_text as rleText, cells_json as cellsBlob,
        created_at as createdAt, updated_at as updatedAt
      FROM shapes
      WHERE name = ? AND is_active = 1
    `, name);

    if (row) {
      return {
        ...row,
        cells: decompressCells(row.cellsBlob)
      };
    }

    // Try case-insensitive match
    row = await db.get(`
      SELECT
        id, name, rule, width, height, population,
        period, speed, user_id as userId, source_url as sourceUrl,
        rle_text as rleText, cells_json as cellsBlob,
        created_at as createdAt, updated_at as updatedAt
      FROM shapes
      WHERE LOWER(name) = LOWER(?) AND is_active = 1
    `, name);

    if (row) {
      return {
        ...row,
        cells: decompressCells(row.cellsBlob)
      };
    }

    return null;
  }

  async addShape(shape) {
    const db = await this.connect();

    // Generate signature from RLE
    let signature = null;
    if (shape.rleText) {
      try {
        signature = generateShapeSignature(shape.rleText);
      } catch (err) {
        console.warn('Failed to generate signature for shape:', shape.name, err.message);
      }
    }

    // Check for duplicate signature
    if (signature) {
      const existing = await db.get('SELECT id, name FROM shapes WHERE signature = ? AND is_active = 1', signature);
      if (existing) {
        return { duplicate: true, existingShape: existing };
      }
    }

    const compressedCells = compressCells(shape.cells);
    const cellsBlob = compressedCells ? Buffer.from(compressedCells) : null;

    await db.run(`
      INSERT INTO shapes (
        id, name, description, slug, rule, width, height, population,
        period, speed, user_id, rle_text, cells_json, signature,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shape.id,
      shape.name,
      shape.description || null,
      shape.slug || null,
      shape.rule || 'B3/S23',
      (shape.width ?? 1),
      (shape.height ?? 1),
      shape.cells?.length || 0,
      shape.period || 1,
      shape.speed || null,
      shape.userId || 'system',
      shape.rleText || null,
      cellsBlob,
      signature,
      shape.createdAt || new Date().toISOString(),
      shape.updatedAt || new Date().toISOString()
    ]);

    return shape;
  }

  async deleteShape(id) {
    const db = await this.connect();
    const result = await db.run(
      'UPDATE shapes SET is_active = 0 WHERE id = ?',
      id
    );
    return result.changes > 0;
  }

  // Search shapes with full-text search
  async searchShapes(query, limit = 50, offset = 0) {
    const db = await this.connect();

    if (!query?.trim()) {
      return await db.all(`
        SELECT
          id, name, rule, width, height, population,
          period, speed, user_id as userId,
          created_at as createdAt, updated_at as updatedAt
        FROM shapes
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, limit, offset);
    }

    // Use FTS when available; fall back to safe LIKE-based ordering.
    try {
      const rows = await db.all(`
        SELECT
          s.id, s.name, s.rule, s.width, s.height, s.population,
          s.period, s.speed, s.user_id as userId,
          s.created_at as createdAt, s.updated_at as updatedAt
        FROM shapes_fts fts
        JOIN shapes s ON fts.rowid = s.rowid
        WHERE shapes_fts MATCH ?
          AND s.is_active = 1
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `, query, limit, offset);
      return rows;
    } catch (err) {
      try { console.warn('FTS search failed, falling back to LIKE search:', err?.message || err); } catch {}
      return await db.all(`
        SELECT
          id, name, rule, width, height, population,
          period, speed, user_id as userId,
          created_at as createdAt, updated_at as updatedAt
        FROM shapes
        WHERE is_active = 1 AND (name LIKE ? OR description LIKE ?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, `%${query}%`, `%${query}%`, limit, offset);
    }
  }

  // Get shapes by user
  async getShapesByUser(userId, limit = 50, offset = 0) {
    const db = await this.connect();
    return await db.all(`
      SELECT
        id, name, rule, width, height, population,
        period, speed, created_at as createdAt, updated_at as updatedAt
      FROM shapes
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, userId, limit, offset);
  }

  // Get shapes by tag
  async getShapesByTag(tagName, limit = 50, offset = 0) {
    const db = await this.connect();
    return await db.all(`
      SELECT
        s.id, s.name, s.rule, s.width, s.height, s.population,
        s.period, s.speed, s.created_at as createdAt, s.updated_at as updatedAt
      FROM shapes s
      JOIN shape_tags st ON s.id = st.shape_id
      JOIN tags t ON st.tag_id = t.id
      WHERE t.name = ? AND s.is_active = 1
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, tagName, limit, offset);
  }

  // Grid state management (keeping compatibility)
  async listGrids() {
    const db = await this.connect();
    const rows = await db.all('SELECT * FROM grids ORDER BY created_at DESC');
    return rows.map(row => ({
      ...row,
      liveCells: row.data ? JSON.parse(row.data) : [],
      generation: row.generation || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getGrid(id) {
    const db = await this.connect();
    const row = await db.get('SELECT * FROM grids WHERE id = ?', id);
    if (!row) return null;
    return {
      ...row,
      liveCells: row.data ? JSON.parse(row.data) : [],
      generation: row.generation || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async saveGrid(grid) {
    const db = await this.connect();
    await db.run(`
      INSERT OR REPLACE INTO grids (id, name, data, user_id, generation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      grid.id,
      grid.name,
      JSON.stringify(grid.data),
      grid.userId,
      grid.generation || 0,
      grid.createdAt || new Date().toISOString(),
      grid.updatedAt || new Date().toISOString()
    ]);
    return grid;
  }

  async deleteGrid(id) {
    const db = await this.connect();
    const result = await db.run('DELETE FROM grids WHERE id = ?', id);
    return result.changes > 0;
  }

  // Enhanced query methods for backend API

  // Get shapes with user access control and search
  async getShapesForUser(userId = null, options = {}) {
    const { q, limit = 50, offset = 0, includeCells = false } = options;
    const db = await this.connect();

    let whereConditions = ['s.is_active = 1'];
    let params = [];

    // User access control
    if (userId) {
      // Authenticated user: show their shapes + system shapes
      whereConditions.push('(s.user_id = ? OR s.user_id = ?)');
      params.push(userId, 'system');
    } else {
      // Unauthenticated user: show only system shapes
      whereConditions.push('s.user_id = ?');
      params.push('system');
    }

    // Search query
    if (q && q.trim()) {
      whereConditions.push('s.name LIKE ?');
      params.push(`%${q.trim()}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    const selectFields = includeCells
      ? 's.id, s.name, s.description, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.source_url as sourceUrl, s.rle_text as rleText, s.cells_json as cellsBlob, s.created_at as createdAt, s.updated_at as updatedAt'
      : 's.id, s.name, s.description, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.created_at as createdAt, s.updated_at as updatedAt';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM shapes s WHERE ${whereClause}`;
    const { total } = await db.get(countQuery, params);

    // Get paginated results
    const query = `
      SELECT ${selectFields}
      FROM shapes s
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.all(query, [...params, limit, offset]);

    // Decompress cells if requested
    const items = rows.map(row => {
      const result = { ...row };
      if (includeCells && row.cellsBlob) {
        result.cells = decompressCells(row.cellsBlob);
      }
      return result;
    });

    return { items, total };
  }

  // Get shape names only (for autocomplete)
  async getShapeNamesForUser(userId = null, options = {}) {
    const { q, limit = 50, offset = 0 } = options;
    const db = await this.connect();

    let whereConditions = ['s.is_active = 1'];
    let params = [];

    // User access control
    if (userId) {
      whereConditions.push('(s.user_id = ? OR s.user_id = ?)');
      params.push(userId, 'system');
    } else {
      whereConditions.push('s.user_id = ?');
      params.push('system');
    }

    // Search query
    if (q && q.trim()) {
      whereConditions.push('s.name LIKE ?');
      params.push(`%${q.trim()}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM shapes s WHERE ${whereClause}`;
    const { total } = await db.get(countQuery, params);

    // Get paginated names
    const query = `
      SELECT s.id, s.name
      FROM shapes s
      WHERE ${whereClause}
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?
    `;
    const items = await db.all(query, [...params, limit, offset]);

    return { items, total };
  }

  // Get public shapes (for public access)
  async getPublicShapes(options = {}) {
    const { q, limit = 50, offset = 0 } = options;
    const db = await this.connect();

    let whereConditions = ['s.is_active = 1', 's.public = 1'];
    let params = [];

    // Search query
    if (q && q.trim()) {
      whereConditions.push('s.name LIKE ?');
      params.push(`%${q.trim()}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM shapes s WHERE ${whereClause}`;
    const { total } = await db.get(countQuery, params);

    // Get paginated results (limited fields for public access)
    const query = `
      SELECT
        s.id, s.name, s.width, s.height, s.population,
        s.user_id as userId, s.created_at as createdAt
      FROM shapes s
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await db.all(query, [...params, limit, offset]);

    return { items, total };
  }

  // Get user's own shapes
  async getUserShapes(userId, options = {}) {
    const { q, limit = 50, offset = 0, includeCells = true } = options;
    const db = await this.connect();

    let whereConditions = ['s.is_active = 1', 's.user_id = ?'];
    let params = [userId];

    // Search query
    if (q && q.trim()) {
      whereConditions.push('s.name LIKE ?');
      params.push(`%${q.trim()}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM shapes s WHERE ${whereClause}`;
    const { total } = await db.get(countQuery, params);

    // Get paginated results
    const selectFields = includeCells
      ? 's.id, s.name, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.public, s.source_url as sourceUrl, s.rle_text as rleText, s.cells_json as cellsBlob, s.created_at as createdAt, s.updated_at as updatedAt'
      : 's.id, s.name, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.public, s.created_at as createdAt, s.updated_at as updatedAt';

    const query = `
      SELECT ${selectFields}
      FROM shapes s
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.all(query, [...params, limit, offset]);

    // Decompress cells if requested
    const items = rows.map(row => {
      const result = { ...row };
      if (includeCells && row.cellsBlob) {
        result.cells = decompressCells(row.cellsBlob);
      }
      return result;
    });

    return { items, total };
  }

  // Write an array of shapes to the DB (used by migrations). This performs
  // an INSERT OR REPLACE inside a transaction and normalizes binary blobs.
  async writeDb(shapes) {
    const db = await this.connect();
    if (!Array.isArray(shapes)) throw new Error('shapes must be an array');

    const sql = `INSERT OR REPLACE INTO shapes (
      id, name, description, slug, rule, width, height, population,
      period, speed, user_id, source_url, rle_text, cells_json, signature,
      created_at, updated_at, is_active, public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await db.exec('BEGIN TRANSACTION');
    try {
      for (const shape of shapes) {
        const compressed = compressCells(shape.cells);
        const cellsBlob = compressed ? Buffer.from(compressed) : null;
        const population = Number.isFinite(Number(shape.population))
          ? Number(shape.population)
          : (Array.isArray(shape.cells) ? shape.cells.length : 0);

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
          cellsBlob,
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
      console.warn('writeDb failed:', err?.message || err);
      throw err;
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
const db = new SQLiteDatabase();

export default db;
export { SQLiteDatabase };