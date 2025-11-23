import './clearBackendLog.js';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { parseRLE } from './rleParser.js';
import db from './db.js';
import logger from './logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateThumbnailsForShape } from './thumbnailGenerator.js';

// NEW — AUTH
import authRouter from './auth/auth.mjs';
import { verifyToken } from './auth/jwtMiddleware.js';

// __dirname equivalent for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeId = () => uuidv4();

const memorySamplesPath = path.join(__dirname, '..', 'data', 'memorySamples.json');
const MAX_MEMORY_SAMPLES = 5000;

const ensureMemorySamplesFile = () => {
  try {
    fs.mkdirSync(path.dirname(memorySamplesPath), { recursive: true });
    if (!fs.existsSync(memorySamplesPath)) {
      fs.writeFileSync(memorySamplesPath, '[]', 'utf8');
    }
  } catch (e) {
    logger.error('Failed to ensure memorySamples file', e?.message || e);
  }
};

const readMemorySamples = () => {
  try {
    ensureMemorySamplesFile();
    const raw = fs.readFileSync(memorySamplesPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logger.warn('Failed to read memory samples', e?.message || e);
    return [];
  }
};

const writeMemorySamples = (samples) => {
  try {
    ensureMemorySamplesFile();
    fs.writeFileSync(memorySamplesPath, JSON.stringify(samples, null, 2));
  } catch (e) {
    logger.error('Failed to write memory samples', e?.message || e);
  }
};

const sanitizeSample = (sample) => {
  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  return {
    ts: toNumber(sample?.ts, Date.now()),
    usedMB: toNumber(sample?.usedMB),
    totalMB: toNumber(sample?.totalMB),
    limitMB: toNumber(sample?.limitMB),
    deltaMB: toNumber(sample?.deltaMB),
    sessionId: sample?.sessionId || 'unknown',
    clientTime: toNumber(sample?.clientTime, Date.now()),
    serverTs: Date.now(),
    userAgent: sample?.userAgent || 'unknown'
  };
};

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 200);

const findAndSendThumbnail = (res, candidates) => {
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { logger.info('findAndSendThumbnail: ' + p); } catch {}
      if (p.toLowerCase().endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      try { fs.accessSync(p, fs.constants.R_OK); } catch (e) { continue; }
      res.sendFile(p, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ error: 'thumbnail send error' });
        }
      });
      return res;
    }
  }
  return null;
};

const THUMB_NOT_FOUND_STR = 'thumbnail not found';

const scanSchemesInSize = (sizeDir, nameSlug) => {
  const out = [];
  try {
    const schemesInSize = fs.readdirSync(sizeDir, { withFileTypes: true });
    for (const sChild of schemesInSize) {
      if (!sChild.isDirectory()) continue;
      out.push(path.join(sizeDir, sChild.name, `${nameSlug}.png`));
      out.push(path.join(sizeDir, sChild.name, `${nameSlug}.svg`));
    }
  } catch (e) {
    logger.warn('scanSchemesInSize failed', e?.message || e);
  }
  return out;
};

const scanSizeDirectories = (baseThumbs, nameSlug, scheme) => {
  const out = [];
  try {
    const children = fs.readdirSync(baseThumbs, { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const sizeDir = path.join(baseThumbs, child.name);
      if (scheme) {
        out.push(path.join(sizeDir, scheme, `${nameSlug}.png`));
        out.push(path.join(sizeDir, scheme, `${nameSlug}.svg`));
        out.push(path.join(sizeDir, `${nameSlug}.png`));
        out.push(path.join(sizeDir, `${nameSlug}.svg`));
      } else {
        out.push(path.join(sizeDir, `${nameSlug}.png`));
        out.push(path.join(sizeDir, `${nameSlug}.svg`));
        out.push(...scanSchemesInSize(sizeDir, nameSlug));
      }
    }
  } catch (e) {
    logger.warn('scanSizeDirectories failed', e?.message || e);
  }
  return out;
};

const buildCandidatesForName = (baseThumbs, nameSlug, scheme, size) => {
  const candidates = [];
  if (size) {
    const sizeDir = path.join(baseThumbs, String(size));
    if (scheme) {
      candidates.push(path.join(sizeDir, scheme, `${nameSlug}.png`));
      candidates.push(path.join(sizeDir, scheme, `${nameSlug}.svg`));
    }
    candidates.push(path.join(sizeDir, `${nameSlug}.png`));
    candidates.push(path.join(sizeDir, `${nameSlug}.svg`));
    return candidates;
  }
  if (scheme) {
    candidates.push(path.join(baseThumbs, scheme, `${nameSlug}.png`));
    candidates.push(path.join(baseThumbs, scheme, `${nameSlug}.svg`));
  }
  candidates.push(path.join(baseThumbs, `${nameSlug}.png`));
  candidates.push(path.join(baseThumbs, `${nameSlug}.svg`));
  return candidates.concat(scanSizeDirectories(baseThumbs, nameSlug, scheme));
};

const ensureUniqueName = async (baseName) => {
  const shapes = await db.listShapes();
  const existingNames = new Set(shapes.map(s => s.name?.toLowerCase()));
  let unique = baseName;
  let counter = 1;
  while (existingNames.has(unique.toLowerCase())) {
    unique = `${baseName} (${counter++})`;
  }
  return unique;
};

export function createApp() {
  const app = express();

  app.use(cors());
  app.options('*', cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.text({ type: ['text/*', 'application/octet-stream'], limit: '5mb' }));

  // NEW — AUTH ROUTES
  app.use('/auth', (req, res, next) => {
    logger.info(`[DEBUG] /auth route received: ${req.method} ${req.originalUrl}`);
    next();
  }, authRouter);
  console.log('Auth router mounted at /auth');

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const len = req.headers['content-length'] || '-';
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms cl=${len}`);
    });
    next();
  });

  app.get('/v1/health', (req, res) => res.json({ ok: true }));

  // Memory samples
  app.get('/v1/memory-samples', (req, res) => {
    try {
      const all = readMemorySamples();
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
      const start = Math.max(0, all.length - limit);
      res.json({ items: all.slice(start), total: all.length });
    } catch (e) {
      logger.error('memory samples fetch failed', e?.message || e);
      res.status(500).json({ error: 'failed to load memory samples' });
    }
  });

  app.post('/v1/memory-samples', (req, res) => {
    try {
      const raw = Array.isArray(req.body?.samples)
        ? req.body.samples
        : (Array.isArray(req.body) ? req.body : null);
      if (!raw) return res.status(400).json({ error: 'samples array required' });
      const sanitized = raw.map(sanitizeSample);
      const merged = readMemorySamples().concat(sanitized).slice(-MAX_MEMORY_SAMPLES);
      writeMemorySamples(merged);
      res.status(202).json({ stored: sanitized.length, total: merged.length });
    } catch (e) {
      logger.error('memory samples save failed', e?.message || e);
      res.status(500).json({ error: 'failed to persist memory samples' });
    }
  });

  // Shapes — browse (public)
  app.get('/v1/shapes', async (req, res) => {
    try {
      const q = (req.query.q || '').toLowerCase();
      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const shapes = await db.listShapes();
      const filtered = q
        ? shapes.filter(s => (s.name || '').toLowerCase().includes(q))
        : shapes;
      res.json({ items: filtered.slice(offset, offset + limit), total: filtered.length });
    } catch (err) {
      logger.error('shapes list error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Names list (public)
  app.get('/v1/shapes/names', async (req, res) => {
    try {
      const q = (req.query.q || '').toLowerCase();
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const shapes = await db.listShapes();
      const filtered = q
        ? shapes.filter(s => (s.name || '').toLowerCase().includes(q))
        : shapes;
      const items = filtered.slice(offset, offset + limit).map(s => ({
        id: s.id,
        name: s.name
      }));
      res.json({ items, total: filtered.length });
    } catch (err) {
      logger.error('shapes names error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Removed: GET thumbnails (public) and GET shape by ID thumbnail endpoints. Thumbnails are now served as static assets from /public/thumbnails.

  // GET shape (public)
  app.get('/v1/shapes/:id', async (req, res) => {
    const s = await db.getShape(req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    res.json(s);
  });

  // DELETE shape (protected)
  app.delete('/v1/shapes/:id', verifyToken, async (req, res) => {
    try {
      const ok = await db.deleteShape(req.params.id);
      if (!ok) return res.status(404).json({ error: 'not found' });
      res.status(204).end();
    } catch (err) {
      logger.error('delete error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Body size error handler
  app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        error: 'Request payload too large',
        maxJson: '10mb'
      });
    }
    next(err);
  });

  // CREATE shape (protected)
  app.post('/v1/shapes', verifyToken, async (req, res) => {
    try {
      const shape = req.body;
      if (!shape || typeof shape !== 'object') {
        return res.status(400).json({ error: 'shape required' });
      }

      if (!shape.id) shape.id = makeId();
      if (shape.name) shape.name = await ensureUniqueName(shape.name);

      shape.meta = shape.meta || {};
      shape.meta.createdAt = shape.meta.createdAt || new Date().toISOString();
      shape.meta.source = shape.meta.source || 'user-created';

      await db.addShape(shape);

      generateThumbnailsForShape(shape).catch(e =>
        logger.error('thumbnail generation failed:', e?.message || e)
      );

      res.status(201).json(shape);
    } catch (err) {
      logger.error('add shape error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Import RLE (protected)
  app.post('/v1/import-rle', verifyToken, async (req, res) => {
    try {
      let rleText =
        (req.is('application/json') && req.body?.rle) ||
        (typeof req.body === 'string' && req.body.trim());
      if (!rleText) {
        return res.status(400).json({ error: 'No RLE found' });
      }

      const shape = parseRLE(rleText);
      shape.id = makeId();

      if (shape.name) shape.name = await ensureUniqueName(shape.name);

      shape.meta = shape.meta || {};
      shape.meta.importedAt = new Date().toISOString();
      shape.meta.source = 'rle-import';

      await db.addShape(shape);
      res.status(201).json(shape);
    } catch (err) {
      logger.error('import error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Grids — list (public)
  app.get('/v1/grids', async (req, res) => {
    try {
      const grids = await db.listGrids();
      res.json(
        grids.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          generation: g.generation,
          liveCells: g.liveCells ? g.liveCells.length : 0,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt
        }))
      );
    } catch (err) {
      logger.error('grids list error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET grid (public)
  app.get('/v1/grids/:id', async (req, res) => {
    try {
      const grid = await db.getGrid(req.params.id);
      if (!grid) return res.status(404).json({ error: 'Grid not found' });
      res.json(grid);
    } catch (err) {
      logger.error('get grid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE grid (protected)
  app.post('/v1/grids', verifyToken, async (req, res) => {
    try {
      const { name, description, liveCells, generation } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Grid name is required' });
      }
      if (!Array.isArray(liveCells)) {
        return res.status(400).json({ error: 'liveCells array is required' });
      }

      const grid = {
        id: makeId(),
        name: name.trim(),
        description: description || '',
        liveCells,
        generation: generation || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.saveGrid(grid);
      res.status(201).json(grid);
    } catch (err) {
      logger.error('save grid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE grid (protected)
  app.put('/v1/grids/:id', verifyToken, async (req, res) => {
    try {
      const existing = await db.getGrid(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Grid not found' });

      const { name, description, liveCells, generation } = req.body;

      const updated = {
        ...existing,
        name: name || existing.name,
        description: description ?? existing.description,
        liveCells: liveCells || existing.liveCells,
        generation: generation ?? existing.generation,
        updatedAt: new Date().toISOString()
      };

      await db.saveGrid(updated);
      res.json(updated);
    } catch (err) {
      logger.error('update grid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE grid (protected)
  app.delete('/v1/grids/:id', verifyToken, async (req, res) => {
    try {
      const ok = await db.deleteGrid(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Grid not found' });
      res.status(204).end();
    } catch (err) {
      logger.error('delete grid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DEMO glider load (protected)
  app.post('/v1/demo/load-glider', verifyToken, async (req, res) => {
    const rle = `#N Glider\nx = 3, y = 3\nbo$2bo$3o!`;
    const shape = parseRLE(rle);
    shape.id = makeId();
    shape.meta = shape.meta || {};
    shape.meta.importedAt = new Date().toISOString();
    await db.addShape(shape);
    res.status(201).json(shape);
  });

  // Global error handler (always returns JSON)
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

export async function start() {
  const app = createApp();
  const port = process.env.GOL_BACKEND_PORT || process.env.PORT || 55000;
  const host = '0.0.0.0';
  return new Promise(resolve => {
    const server = app.listen(port, host, () => {
      const addr = server.address();
      const bind = addr && typeof addr === 'object'
        ? `${addr.address}:${addr.port}`
        : String(addr);
      logger.info(`Shapes backend listening on ${bind}`);
      resolve({ app, server });
    });
  });
}

const isMain = (() => {
  try {
    const file = fileURLToPath(import.meta.url);
    return process.argv[1] && file === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

if (isMain) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
