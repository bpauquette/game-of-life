import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { parseRLE } from './rleParser.js';
import db from './db.js';
import logger from './logger.js';

const makeId = () => {
  return uuidv4();
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

const start = async () => {
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

  // Return only id and name for all shapes. This supports a lightweight
  // client that needs only the catalog of names.
  app.get('/v1/shapes/names', async (req, res) => {
    try {
      const shapes = await db.listShapes();
      const items = shapes.map(s => ({ id: s.id, name: s.name }));
      res.json({ items, total: items.length });
    } catch (err) {
      logger.error('shapes names error:', err);
      res.status(500).json({ error: err.message });
    }
  });

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

  // Port selection priority:
  // 1) GOL_BACKEND_PORT env var
  // 2) PORT env var (common)
  // 3) default 55000
  const port = process.env.GOL_BACKEND_PORT || process.env.PORT || 55000;
  app.listen(port, ()=> logger.info(`Shapes catalog backend listening on ${port}`));
}

// Use top-level await instead of async IIFE
try {
  await start();
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
