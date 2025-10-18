const express = require('express');
const cors = require('cors');
const path = require('path');
const { parseRLE } = require('./rleParser');
const db = require('./db');

function makeId(){
  return `${Date.now()}-${Math.floor(Math.random()*100000)}`;
}

async function start(){
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.text({ type: ['text/*', 'application/octet-stream'], limit: '1mb' }));

  app.get('/v1/health', (req,res)=> res.json({ok:true}));

  app.get('/v1/shapes', async (req,res)=>{
    const q = (req.query.q || '').toLowerCase();
    const shapes = await db.listShapes();
    const out = q ? shapes.filter(s => (s.name||'').toLowerCase().includes(q)) : shapes;
    res.json(out);
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
      console.error('delete error', err);
      res.status(500).json({error: err.message});
    }
  });

  // Allow adding a full shape object (used by UI undo)
  app.post('/v1/shapes', async (req,res)=>{
    try{
      const shape = req.body;
      if(!shape || typeof shape !== 'object' || !shape.id) return res.status(400).json({error:'shape object with id required'});
      // add to DB
      await db.addShape(shape);
      res.status(201).json(shape);
    }catch(err){
      console.error('add shape error', err);
      res.status(500).json({error: err.message});
    }
  });

  app.post('/v1/import-rle', async (req,res)=>{
    try{
      let rleText = null;
      if(req.is('application/json') && req.body && req.body.rle) rleText = req.body.rle;
      else if(typeof req.body === 'string' && req.body.trim().length>0) rleText = req.body;
      if(!rleText) return res.status(400).json({error:'No RLE found in request body; send JSON {rle: "..."} or text/plain body'});

      const shape = parseRLE(rleText);
      shape.id = makeId();
      shape.meta = shape.meta || {};
      shape.meta.importedAt = (new Date()).toISOString();

      await db.addShape(shape);
      res.status(201).json(shape);
    }catch(err){
      console.error('import error', err);
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
  app.listen(port, ()=> console.log(`Shapes catalog backend listening on ${port}`));
}

start().catch(err=>{
  console.error('Failed to start server', err);
  process.exit(1);
});
