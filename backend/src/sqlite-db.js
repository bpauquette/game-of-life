import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako';
import { generateShapeSignature } from './shapeSignature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'shapes.db');

// Compress/decompress cells
const compressCells = (cells) => {
  if (!cells || cells.length === 0) return null;
  const json = JSON.stringify(cells);
  return pako.deflate(json);
};

const decompressCells = (cellsBlob) => {
  if (!cellsBlob) return null;
  try {
    const decompressed = pako.inflate(new Uint8Array(cellsBlob), { to: 'string' });
    return JSON.parse(decompressed);
  } catch (e) {
    return null;
  }
};

class SQLiteDatabase {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (this.db) return this.db;

    console.log('Connecting to SQLite database at', DB_PATH);
    this.db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // Enable WAL mode for better concurrency
    await this.db.exec('PRAGMA journal_mode = WAL');
    await this.db.exec('PRAGMA synchronous = NORMAL');
    await this.db.exec('PRAGMA cache_size = 1000000'); // 1GB cache

    // Ensure signature column exists
    await this.ensureSignatureColumn();

    console.log('SQLite database connected');
    return this.db;
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
      
      if (!hasSignature) {
        console.log('Adding signature column to shapes table');
        await db.exec('ALTER TABLE shapes ADD COLUMN signature TEXT UNIQUE');
        console.log('Signature column added');
      }
    } catch (err) {
      console.warn('Error ensuring signature column:', err.message);
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
        id, name, rule, width, height, population,
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

    await db.run(`
      INSERT INTO shapes (
        id, name, slug, rule, width, height, population,
        period, speed, user_id, rle_text, cells_json, signature,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shape.id,
      shape.name,
      shape.slug || null,
      shape.rule || 'B3/S23',
      shape.width,
      shape.height,
      shape.cells?.length || 0,
      shape.period || 1,
      shape.speed || null,
      shape.userId || 'system',
      shape.rleText || null,
      compressedCells,
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

    // Use FTS for text search
    const rows = await db.all(`
      SELECT
        s.id, s.name, s.rule, s.width, s.height, s.population,
        s.period, s.speed, s.user_id as userId,
        s.created_at as createdAt, s.updated_at as updatedAt
      FROM shapes_fts fts
      JOIN shapes s ON fts.rowid = s.rowid
      WHERE shapes_fts MATCH ?
        AND s.is_active = 1
      ORDER BY rank
      LIMIT ? OFFSET ?
    `, query, limit, offset);

    return rows;
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
    return await db.all('SELECT * FROM grids ORDER BY created_at DESC');
  }

  async getGrid(id) {
    const db = await this.connect();
    return await db.get('SELECT * FROM grids WHERE id = ?', id);
  }

  async saveGrid(grid) {
    const db = await this.connect();
    await db.run(`
      INSERT OR REPLACE INTO grids (id, name, data, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      grid.id,
      grid.name,
      JSON.stringify(grid.data),
      grid.userId,
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
      ? 's.id, s.name, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.source_url as sourceUrl, s.rle_text as rleText, s.cells_json as cellsBlob, s.created_at as createdAt, s.updated_at as updatedAt'
      : 's.id, s.name, s.rule, s.width, s.height, s.population, s.period, s.speed, s.user_id as userId, s.created_at as createdAt, s.updated_at as updatedAt';

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