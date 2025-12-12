import pkg from 'pg';
import pako from 'pako';
import { generateShapeSignature } from './shapeSignature.js';

const { Pool } = pkg;

/* -------------------------------------------
   CONNECTION
-------------------------------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gol_db',
  user: process.env.DB_USER || 'gol_user',
  password: process.env.DB_PASS || 'password',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/* -------------------------------------------
   HELPERS
-------------------------------------------- */

const compressCells = (cells) => {
  if (!cells || (Array.isArray(cells) && cells.length === 0)) return null;
  try {
    const json = JSON.stringify(cells);
    return Buffer.from(pako.deflate(json));
  } catch {
    return null;
  }
};

const decompressCells = (blob) => {
  if (!blob) return null;
  try {
    const input = blob instanceof Uint8Array ? blob : Buffer.from(blob);
    const str = pako.inflate(input, { to: 'string' });
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const rowToShape = (row, includeCells = true) => {
  if (!row) return null;
  const cells = includeCells ? decompressCells(row.cells_json) : undefined;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    rule: row.rule,
    width: row.width,
    height: row.height,
    population: row.population,
    period: row.period,
    speed: row.speed,
    userId: row.user_id,
    sourceUrl: row.source_url,
    rleText: row.rle_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    public: row.public,
    ...(includeCells && { cells }),
  };
};

/* -------------------------------------------
   MAIN CLASS
-------------------------------------------- */

class PostgresDatabase {
  async connect() {
    // Test a simple query to ensure connection
    await pool.query('SELECT 1');
    await this.ensureTables();
    return pool;
  }

  /* -------------------------------------------
     SCHEMA CREATION (PostgreSQL equivalents)
  -------------------------------------------- */
  async ensureTables() {
    await pool.query(`
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
        cells_json BYTEA,
        signature TEXT UNIQUE,
        public INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grids (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        user_id TEXT NOT NULL,
        generation INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS shapes_name_idx ON shapes (LOWER(name));
    `);
  }

  /* -------------------------------------------
     BASIC SHAPE OPERATIONS
  -------------------------------------------- */

  async listShapes() {
    await this.connect();
    const res = await pool.query(`
      SELECT * FROM shapes WHERE is_active = 1 ORDER BY created_at DESC
    `);
    return res.rows.map(r => rowToShape(r));
  }

  async clearShapes() {
    await this.connect();
    await pool.query(`UPDATE shapes SET is_active = 0`);
  }

  async getShape(id) {
    await this.connect();
    const res = await pool.query(`
      SELECT * FROM shapes WHERE id = $1 AND is_active = 1
    `, [id]);
    return rowToShape(res.rows[0]);
  }

  async getShapeByName(name) {
    await this.connect();

    // exact
    let res = await pool.query(
      `SELECT * FROM shapes WHERE name = $1 AND is_active = 1`,
      [name]
    );
    if (res.rows.length) return rowToShape(res.rows[0]);

    // case-insensitive
    res = await pool.query(
      `SELECT * FROM shapes WHERE LOWER(name) = LOWER($1) AND is_active = 1`,
      [name]
    );
    return rowToShape(res.rows[0]);
  }

  async addShape(shape) {
    await this.connect();

    let signature = null;
    if (shape.rleText) {
      try {
        signature = generateShapeSignature(shape.rleText);
      } catch {}
    }

    if (signature) {
      const duplicate = await pool.query(
        `SELECT id, name FROM shapes WHERE signature = $1 AND is_active = 1`,
        [signature]
      );
      if (duplicate.rows.length) {
        return { duplicate: true, existingShape: duplicate.rows[0] };
      }
    }

    const cellsBlob = compressCells(shape.cells);

    await pool.query(`
      INSERT INTO shapes (
        id, name, description, slug, rule,
        width, height, population, period, speed,
        user_id, source_url, rle_text, cells_json, signature,
        created_at, updated_at, public
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18
      )
    `, [
      shape.id,
      shape.name,
      shape.description || null,
      shape.slug || null,
      shape.rule || 'B3/S23',
      shape.width || 1,
      shape.height || 1,
      shape.cells?.length || 0,
      shape.period || 1,
      shape.speed || null,
      shape.userId || 'system',
      shape.sourceUrl || null,
      shape.rleText || null,
      cellsBlob,
      signature,
      shape.createdAt || new Date().toISOString(),
      shape.updatedAt || new Date().toISOString(),
      shape.public ? 1 : 0
    ]);

    return shape;
  }

  async deleteShape(id) {
    await this.connect();
    const res = await pool.query(
      `UPDATE shapes SET is_active = 0 WHERE id = $1`,
      [id]
    );
    return res.rowCount > 0;
  }

  /* -------------------------------------------
     SEARCH (FTS fallback only)
  -------------------------------------------- */
  async searchShapes(query, limit = 50, offset = 0) {
    await this.connect();

    if (!query?.trim()) {
      const res = await pool.query(`
        SELECT * FROM shapes
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      return res.rows.map(r => rowToShape(r, false));
    }

    // PostgreSQL ILIKE fallback
    const res = await pool.query(`
      SELECT * FROM shapes
      WHERE is_active = 1 AND (name ILIKE $1 OR description ILIKE $1)
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${query}%`, limit, offset]);

    return res.rows.map(r => rowToShape(r, false));
  }

  /* -------------------------------------------
     USER FILTERING APIs (identical signatures)
  -------------------------------------------- */

  async getShapesForUser(userId = null, opts = {}) {
    const { q, limit = 50, offset = 0, includeCells = false } = opts;
    await this.connect();

    const where = [`is_active = 1`];
    const params = [];

    if (userId) {
      params.push(userId, 'system');
      where.push(`(user_id = $${params.length - 1} OR user_id = $${params.length})`);
    } else {
      params.push('system');
      where.push(`user_id = $${params.length}`);
    }

    if (q?.trim()) {
      params.push(`%${q}%`);
      where.push(`name ILIKE $${params.length}`);
    }

    const whereClause = where.join(' AND ');

    const count = await pool.query(`SELECT COUNT(*) AS total FROM shapes WHERE ${whereClause}`, params);
    const total = Number(count.rows[0].total);

    params.push(limit, offset);

    const res = await pool.query(`
      SELECT * FROM shapes
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      items: res.rows.map(r => rowToShape(r, includeCells)),
      total
    };
  }

  async getShapeNamesForUser(userId = null, opts = {}) {
    const { q, limit = 50, offset = 0 } = opts;

    await this.connect();

    const where = [`is_active = 1`];
    const params = [];

    if (userId) {
      params.push(userId, 'system');
      where.push(`(user_id = $${params.length - 1} OR user_id = $${params.length})`);
    } else {
      params.push('system');
      where.push(`user_id = $${params.length}`);
    }

    if (q?.trim()) {
      params.push(`%${q}%`);
      where.push(`name ILIKE $${params.length}`);
    }

    const whereClause = where.join(' AND ');

    const count = await pool.query(`SELECT COUNT(*) AS total FROM shapes WHERE ${whereClause}`, params);
    const total = Number(count.rows[0].total);

    params.push(limit, offset);

    const rows = await pool.query(`
      SELECT id, name FROM shapes
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return { items: rows.rows, total };
  }

  async getPublicShapes(opts = {}) {
    const { q, limit = 50, offset = 0 } = opts;
    await this.connect();

    const where = [`is_active = 1`, `public = 1`];
    const params = [];

    if (q?.trim()) {
      params.push(`%${q}%`);
      where.push(`name ILIKE $${params.length}`);
    }

    const whereClause = where.join(' AND ');

    const count = await pool.query(`SELECT COUNT(*) AS total FROM shapes WHERE ${whereClause}`, params);
    const total = Number(count.rows[0].total);

    params.push(limit, offset);

    const res = await pool.query(`
      SELECT * FROM shapes
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      items: res.rows.map(r => rowToShape(r, false)),
      total
    };
  }

  /** User-only shapes */
  async getUserShapes(userId, opts = {}) {
    const { q, limit = 50, offset = 0, includeCells = true } = opts;
    await this.connect();

    const where = [`is_active = 1`, `user_id = $1`];
    const params = [userId];

    if (q?.trim()) {
      params.push(`%${q}%`);
      where.push(`name ILIKE $${params.length}`);
    }

    const whereClause = where.join(' AND ');

    const count = await pool.query(`SELECT COUNT(*) AS total FROM shapes WHERE ${whereClause}`, params);
    const total = Number(count.rows[0].total);

    params.push(limit, offset);

    const res = await pool.query(`
      SELECT * FROM shapes
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      items: res.rows.map(r => rowToShape(r, includeCells)),
      total
    };
  }

  /* -------------------------------------------
     GRID API (unchanged signatures)
  -------------------------------------------- */

  async listGrids() {
    await this.connect();
    const res = await pool.query(`
      SELECT * FROM grids ORDER BY created_at DESC
    `);
    return res.rows.map(row => ({
      ...row,
      liveCells: row.data ? JSON.parse(row.data) : [],
      generation: row.generation || 0
    }));
  }

  async getGrid(id) {
    await this.connect();
    const res = await pool.query(`SELECT * FROM grids WHERE id = $1`, [id]);
    const row = res.rows[0];
    if (!row) return null;

    return {
      ...row,
      liveCells: row.data ? JSON.parse(row.data) : [],
      generation: row.generation || 0
    };
  }

  async saveGrid(grid) {
    await this.connect();
    await pool.query(`
      INSERT INTO grids (id, name, data, user_id, generation, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        data = EXCLUDED.data,
        user_id = EXCLUDED.user_id,
        generation = EXCLUDED.generation,
        updated_at = EXCLUDED.updated_at
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
    await this.connect();
    const res = await pool.query(`DELETE FROM grids WHERE id = $1`, [id]);
    return res.rowCount > 0;
  }

  /* -------------------------------------------
     BULK WRITE (migration helper)
  -------------------------------------------- */
  async writeDb(shapes) {
    await this.connect();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const shape of shapes) {
        const compressed = compressCells(shape.cells);
        const population = Number(shape.population) || (shape.cells?.length || 0);

        await client.query(`
          INSERT INTO shapes (
            id, name, description, slug, rule, width, height, population,
            period, speed, user_id, source_url, rle_text, cells_json,
            signature, created_at, updated_at, is_active, public
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            slug = EXCLUDED.slug,
            rule = EXCLUDED.rule,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            population = EXCLUDED.population,
            period = EXCLUDED.period,
            speed = EXCLUDED.speed,
            user_id = EXCLUDED.user_id,
            source_url = EXCLUDED.source_url,
            rle_text = EXCLUDED.rle_text,
            cells_json = EXCLUDED.cells_json,
            signature = EXCLUDED.signature,
            updated_at = EXCLUDED.updated_at,
            is_active = EXCLUDED.is_active,
            public = EXCLUDED.public;
        `, [
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
          shape.createdAt || new Date().toISOString(),
          shape.updatedAt || new Date().toISOString(),
          typeof shape.is_active === 'number' ? shape.is_active : 1,
          shape.public ? 1 : 0
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    await pool.end();
  }
}

/* -------------------------------------------
   SINGLETON EXPORT
-------------------------------------------- */

const db = new PostgresDatabase();
export default db;
export { PostgresDatabase };
