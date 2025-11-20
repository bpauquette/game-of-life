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

// __dirname equivalent for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const makeId = () => {
  return uuidv4();
};

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
    logger.warn('Failed to read memory samples, returning empty array', e?.message || e);
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

// Small helpers to keep route handlers concise and reduce cognitive complexity
const slugify = (s) => {
  if (!s) return '';
  return String(s).toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 200) || '';
};

const findAndSendThumbnail = (res, candidates) => {
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      // Prefer logger so managed/background runs write this to backend.log
      try { logger.info('findAndSendThumbnail: candidate exists -> ' + p); } catch (e) {}
      if (p.toLowerCase().endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      // Ensure file is readable and surface any sendFile errors to logs so we can
      // diagnose why a file that exists might not be sent at runtime.
      try {
        // Check read access
        fs.accessSync(p, fs.constants.R_OK);
      } catch (e) {
        logger.warn('thumbnail exists but not readable:', p, e && e.message ? e.message : e);
        // try next candidate
        continue;
      }
      // Use sendFile with a callback to log any runtime errors
      try { logger.info('findAndSendThumbnail: calling res.sendFile for ' + p); } catch (e) {}
      res.sendFile(p, (err) => {
        if (err) {
          logger.error('sendFile error for thumbnail:', p, err && err.message ? err.message : err);
          // If headers not sent yet, return a 500 to the client to indicate server-side failure
          if (!res.headersSent) {
            res.status(500).json({ error: 'thumbnail send error' });
          }
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
    // Log the error so it can be diagnosed instead of silently ignoring filesystem issues
    logger.warn('scanSchemesInSize failed for', sizeDir, e && e.message ? e.message : e);
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
        const schemeDirInSize = path.join(sizeDir, scheme);
        out.push(path.join(schemeDirInSize, `${nameSlug}.png`));
        out.push(path.join(schemeDirInSize, `${nameSlug}.svg`));
        out.push(path.join(sizeDir, `${nameSlug}.png`));
        out.push(path.join(sizeDir, `${nameSlug}.svg`));
      } else {
        out.push(path.join(sizeDir, `${nameSlug}.png`));
        out.push(path.join(sizeDir, `${nameSlug}.svg`));
        out.push(...scanSchemesInSize(sizeDir, nameSlug));
      }
    }
  } catch (e) {
    // Log the error so filesystem/read issues are visible rather than silently ignored
    logger.warn('scanSizeDirectories failed for', baseThumbs, e && e.message ? e.message : e);
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

  // No explicit size: prefer scheme-specific, then top-level, then scan size subdirs
  if (scheme) {
    candidates.push(path.join(baseThumbs, scheme, `${nameSlug}.png`));
    candidates.push(path.join(baseThumbs, scheme, `${nameSlug}.svg`));
  }
  candidates.push(path.join(baseThumbs, `${nameSlug}.png`));
  candidates.push(path.join(baseThumbs, `${nameSlug}.svg`));
  const scanned = scanSizeDirectories(baseThumbs, nameSlug, scheme);
  return candidates.concat(scanned);
};

// Helper function to ensure unique names
const ensureUniqueName = async (baseName, userId = null) => {
  const shapes = await db.listShapes();
  const existingNames = new Set(shapes.map(s => s.name?.toLowerCase()));
  
  let uniqueName = baseName;
  let counter = 1;
  
  while (existingNames.has(uniqueName.toLowerCase())) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }
  
  return uniqueName;
};

export function createApp() {
  const app = express();
  app.use(cors());
  // Explicitly enable preflight for all routes (helps some mobile browsers)
  app.options('*', cors());
  // Increase body size limits to support large grids/shapes from mobile
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.text({ type: ['text/*', 'application/octet-stream'], limit: '5mb' }));

  // Lightweight request logger (no bodies)
  app.use((req, res, next) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on('finish', () => {
      const ms = Date.now() - start;
      const len = req.headers['content-length'] || '-';
      logger.info(`${method} ${originalUrl} -> ${res.statusCode} ${ms}ms cl=${len}`);
    });
    next();
  });

  app.get('/v1/health', (req,res)=> res.json({ok:true}));

  app.get('/v1/memory-samples', (req, res) => {
    try {
      const all = readMemorySamples();
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
      const start = Math.max(0, all.length - limit);
      const items = all.slice(start);
      res.json({ items, total: all.length });
    } catch (e) {
      logger.error('memory samples fetch failed', e?.message || e);
      res.status(500).json({ error: 'failed to load memory samples' });
    }
  });

  app.post('/v1/memory-samples', (req, res) => {
    try {
      const rawSamples = Array.isArray(req.body?.samples)
        ? req.body.samples
        : (Array.isArray(req.body) ? req.body : null);
      if (!rawSamples) {
        return res.status(400).json({ error: 'samples array required' });
      }
      const sanitized = rawSamples.map(sanitizeSample);
      const existing = readMemorySamples();
      const merged = existing.concat(sanitized);
      const trimmed = merged.slice(-MAX_MEMORY_SAMPLES);
      writeMemorySamples(trimmed);
      res.status(202).json({ stored: sanitized.length, total: trimmed.length });
    } catch (e) {
      logger.error('memory samples save failed', e?.message || e);
      res.status(500).json({ error: 'failed to persist memory samples' });
    }
  });

  app.get('/v1/shapes', async (req,res)=>{
    try{
      const q = (req.query.q || '').toLowerCase();
      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const shapes = await db.listShapes();
      // filter by query if present
      const filtered = q ? shapes.filter(s => (s.name||'').toLowerCase().includes(q)) : shapes;
      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
  // return full shape objects (including cells) for each page
  const items = page; // full objects
  res.json({ items, total });
    }catch(err){
      logger.error('shapes list error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Return id and name for shapes with optional pagination and query.
  // Query params: q (substring match), limit (max items), offset (start index)
  app.get('/v1/shapes/names', async (req, res) => {
    try {
      const q = (req.query.q || '').toLowerCase();
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const shapes = await db.listShapes();
      const filtered = q ? shapes.filter(s => (s.name || '').toLowerCase().includes(q)) : shapes;
      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      const items = page.map(s => ({ id: s.id, name: s.name }));
      res.json({ items, total });
    } catch (err) {
      logger.error('shapes names error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // NOTE: POST /v1/shapes/thumbnail removed — thumbnail serving is GET-only and
  // thumbnails are written on shape save. If a thumbnail is missing, return 404.

  // Serve a thumbnail (prefer PNG if available, else SVG).
  // Optional query param `scheme` can be provided to select per-color-scheme thumbnails
  // Also support name-based thumbnail requests at /v1/shapes/thumbnail?name=<slug>&scheme=&size=
  app.get('/v1/shapes/thumbnail', async (req, res) => {
    try {
      const nameSlug = req.query.name;
      const scheme = req.query.scheme;
      const size = req.query.size; // optional size (e.g., '128')
  if (!nameSlug) return res.status(400).json({ error: 'name query param required' });

      const baseThumbs = path.join(__dirname, '..', 'data', 'thumbnails');
      const candidates = buildCandidatesForName(baseThumbs, nameSlug, scheme, size);
      // Always log candidate paths and their existence to help debug missing thumbnails
      try {
        const existInfo = candidates.slice(0, 50).map(p => ({ path: p, exists: fs.existsSync(p) }));
        // Use console.log in addition to logger so output appears even when
        // NODE_ENV silences logger.info in production-like environments.
        console.log('thumbnail candidates (first 50):', JSON.stringify(existInfo));
        logger.info('thumbnail candidates (first 50):', existInfo);
      } catch (e) {
        logger.warn('Failed to stat thumbnail candidates:', e && e.message ? e.message : e);
      }
      // Extra: always log full candidates array for this request so we can
      // trace control flow when a request yields 404 despite files existing.
      try {
        try { console.log('name-based request candidates:', JSON.stringify(candidates)); } catch (e) {}
        logger.info('name-based request candidates', candidates);
      } catch (e) {
        // ignore
      }
  // Debug: optionally dump candidate paths and file existence when debugging thumbnails
  if (process.env.GOL_DEBUG_THUMBS) {
    try {
      const existInfo = candidates.map(p => ({ path: p, exists: fs.existsSync(p) }));
      logger.info('thumbnail candidate existence:', existInfo.slice(0, 20));
    } catch (e) {
      logger.warn('thumbnail debug check failed:', e?.message || e);
    }
  }
  if (findAndSendThumbnail(res, candidates)) return;
  logger.info('thumbnail candidates checked (none found):', candidates.slice(0,10));
  return res.status(404).json({ error: THUMB_NOT_FOUND_STR });
    } catch (err) {
      logger.error('thumbnail by name serve error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Temporary debug route: serve a known thumbnail file directly to test sendFile
  app.get('/__debug/thumbtest', (req, res) => {
    try {
      const testPath = path.join(__dirname, '..', 'data', 'thumbnails', '128', 'bio', '119p4h1v0.png');
      if (!fs.existsSync(testPath)) return res.status(404).send('test file missing');
      return res.sendFile(testPath);
    } catch (e) {
      logger.error('debug thumbtest error:', e?.message || e);
      return res.status(500).json({ error: e?.message || String(e) });
    }
  });

  // Debug: report candidate thumbnail paths and whether they exist
  app.get('/__debug/thumbexist', (req, res) => {
    try {
      const nameSlug = req.query.name;
      const scheme = req.query.scheme;
      const size = req.query.size;
      if (!nameSlug) return res.status(400).json({ error: 'name query param required' });
      const baseThumbs = path.join(__dirname, '..', 'data', 'thumbnails');
      const candidates = buildCandidatesForName(baseThumbs, nameSlug, scheme, size);
      const existInfo = candidates.map(p => ({ path: p, exists: fs.existsSync(p) }));
      // Also print to stdout to make sure manager-captured logs include it
      console.log('__debug/thumbexist:', JSON.stringify(existInfo.slice(0,50)));
      return res.json({ items: existInfo });
    } catch (e) {
      logger.error('thumbexist error:', e && e.message ? e.message : e);
      return res.status(500).json({ error: String(e) });
    }
  });
  app.get('/v1/shapes/:id/thumbnail', async (req, res) => {
    try {
      const id = req.params.id;
      const scheme = req.query.scheme;
  const baseThumbs = path.join(__dirname, '..', 'data', 'thumbnails');
      
      // Lookup the shape and require a name; we only serve name-based thumbnails.
      let nameSlug = '';
      try {
        const shapeObj = await db.getShape(id);
        if (!shapeObj || !shapeObj.name) {
          return res.status(404).json({ error: 'thumbnail not found (shape has no name)' });
        }
        nameSlug = slugify(shapeObj.name);
      } catch (e) {
        logger.warn('Could not lookup shape for thumbnail request:', e?.message || e);
        return res.status(404).json({ error: 'thumbnail not found' });
      }

  const candidates = buildCandidatesForName(baseThumbs, nameSlug, scheme, null);
  if (findAndSendThumbnail(res, candidates)) return;
  return res.status(404).json({ error: THUMB_NOT_FOUND_STR });
    } catch (err) {
      logger.error('thumbnail serve error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // IMPORTANT: Register the generic "/v1/shapes/:id" route AFTER more specific
  // routes like "/v1/shapes/thumbnail" to avoid accidental matching where
  // ":id" would capture the literal string "thumbnail". Express matches in
  // registration order.
  app.get('/v1/shapes/:id', async (req,res)=>{
    const s = await db.getShape(req.params.id);
    if(!s) return res.status(404).json({error:'not found'});
    res.json(s);
  });

  

  app.delete('/v1/shapes/:id', async (req,res)=>{
    try{
      const ok = await db.deleteShape(req.params.id);
      if(!ok) return res.status(404).json({error:'not found'});
      res.status(204).end();
    }catch(err){
      logger.error('delete error:', err);
      res.status(500).json({error: err.message});
    }
  });

  // Handle payload-too-large and other body parsing errors with a clear message
  // This must come after the body parsers have been registered but before the catch-all error handling
  app.use((err, req, res, next) => {
    // Body parser sets type for size errors
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      const cl = req.headers['content-length'] || '-';
      logger.warn(`413 Payload too large at ${req.method} ${req.originalUrl} cl=${cl}`);
      return res.status(413).json({
        error: 'Request payload too large. Try saving a smaller grid or update server limits.',
        maxJson: '10mb'
      });
    }
    return next(err);
  });

  // Allow adding a full shape object (used by UI and capture tool)
  app.post('/v1/shapes', async (req,res)=>{
    try{
      const shape = req.body;
      if(!shape || typeof shape !== 'object') return res.status(400).json({error:'shape object required'});
      
      // Generate UUID if no ID provided
      if (!shape.id) {
        shape.id = makeId();
      }
      
      // Ensure unique name if provided
      if (shape.name) {
        shape.name = await ensureUniqueName(shape.name);
      }
      
      // Add metadata
      shape.meta = shape.meta || {};
      shape.meta.createdAt = shape.meta.createdAt || new Date().toISOString();
      shape.meta.source = shape.meta.source || 'user-created';
      
      // Add to DB
      await db.addShape(shape);
      // Generate thumbnails asynchronously via helper
      generateThumbnailsForShape(shape).catch(e => {
        logger.error('thumbnail generation failed:', e?.message || e);
      });
      res.status(201).json(shape);
    }catch(err){
      logger.error('add shape error:', err);
      res.status(500).json({error: err.message});
    }
  });

  app.post('/v1/import-rle', async (req,res)=>{
    try{
      let rleText = null;
      if(req.is('application/json') && req.body?.rle) rleText = req.body.rle;
      else if(typeof req.body === 'string' && req.body.trim().length>0) rleText = req.body;
      if(!rleText) return res.status(400).json({error:'No RLE found in request body; send JSON {rle: "..."} or text/plain body'});

      const shape = parseRLE(rleText);
      shape.id = makeId();
      
      // Ensure unique name if provided
      if (shape.name) {
        shape.name = await ensureUniqueName(shape.name);
      }
      
      shape.meta = shape.meta || {};
      shape.meta.importedAt = (new Date()).toISOString();
      shape.meta.source = 'rle-import';

      await db.addShape(shape);
      res.status(201).json(shape);
    }catch(err){
      logger.error('import error:', err);
      res.status(500).json({error: err.message});
    }
  });

  // Grid state management endpoints
  app.get('/v1/grids', async (req,res)=>{
    try{
      const grids = await db.listGrids();
      // Return metadata only (exclude cells for list view)
      const gridList = grids.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        generation: g.generation,
        liveCells: g.liveCells ? g.liveCells.length : 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      }));
      res.json(gridList);
    }catch(err){
      logger.error('grids list error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/v1/grids/:id', async (req,res)=>{
    try{
      const grid = await db.getGrid(req.params.id);
      if(!grid) return res.status(404).json({error:'Grid not found'});
      res.json(grid);
    }catch(err){
      logger.error('get grid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/v1/grids', async (req,res)=>{
    try{
      const { name, description, liveCells, generation } = req.body;
      const cl = req.headers['content-length'] || '-';
      const count = Array.isArray(liveCells) ? liveCells.length : 'n/a';
      logger.info(`POST /v1/grids start name="${String(name||'').slice(0,100)}" cells=${count} gen=${generation||0} cl=${cl}`);
      
      if(!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({error:'Grid name is required'});
      }
      
      if(!Array.isArray(liveCells)) {
        return res.status(400).json({error:'liveCells array is required'});
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
      logger.info(`POST /v1/grids ok id=${grid.id} cells=${grid.liveCells.length}`);
      res.status(201).json(grid);
    }catch(err){
      logger.error('save grid error:', err);
      res.status(500).json({error: err.message});
    }
  });

  app.put('/v1/grids/:id', async (req,res)=>{
    try{
      const existingGrid = await db.getGrid(req.params.id);
      if(!existingGrid) return res.status(404).json({error:'Grid not found'});

      const { name, description, liveCells, generation } = req.body;
      
      const updatedGrid = {
        ...existingGrid,
        name: name || existingGrid.name,
        description: description ?? existingGrid.description,
        liveCells: liveCells || existingGrid.liveCells,
        generation: generation ?? existingGrid.generation,
        updatedAt: new Date().toISOString()
      };

      await db.saveGrid(updatedGrid);
      res.json(updatedGrid);
    }catch(err){
      logger.error('update grid error:', err);
      res.status(500).json({error: err.message});
    }
  });

  app.delete('/v1/grids/:id', async (req,res)=>{
    try{
      const ok = await db.deleteGrid(req.params.id);
      if(!ok) return res.status(404).json({error:'Grid not found'});
      res.status(204).end();
    }catch(err){
      logger.error('delete grid error:', err);
      res.status(500).json({error: err.message});
    }
  });

  // demo route to create a glider pattern quickly
  app.post('/v1/demo/load-glider', async (req,res)=>{
    const gliderRLE = `#N Glider\nx = 3, y = 3\nbo$2bo$3o!`;
    const shape = parseRLE(gliderRLE);
    shape.id = makeId();
    shape.meta = shape.meta || {};
    shape.meta.importedAt = (new Date()).toISOString();
    await db.addShape(shape);
    res.status(201).json(shape);
  });

  return app;
}

export async function start() {
  const app = createApp();
  const port = process.env.GOL_BACKEND_PORT || process.env.PORT || 55000;
  const host = '0.0.0.0';
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      try {
        const addr = server.address();
        const bindInfo = (addr && typeof addr === 'object') ? `${addr.address}:${addr.port}` : String(addr);
        logger.info(`Shapes catalog backend listening on ${bindInfo}`);
        try { console.log(`Shapes backend listening on ${bindInfo}`); } catch (e) {}
      } catch (e) {
        logger.info(`Shapes catalog backend listening on port ${port}`);
      }
      resolve({ app, server });
    });
  });
}

// Only auto-start when executed directly (not when imported by tests)
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && (thisFile === path.resolve(process.argv[1]));
  } catch {
    return false;
  }
})();

if (isMain) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
