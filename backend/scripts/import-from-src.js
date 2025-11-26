#!/usr/bin/env node
const fs = require('node:fs').promises;
const path = require('node:path');
const os = require('node:os');

const makeId = () => {
  return `${Date.now()}-${Math.floor(Math.random()*100000)}`;
};

const shapeSignature = (s) => {
  const cells = (s.cells || []).map(c => `${c.x},${c.y}`).sort().join('|');
  return `${s.name||''}::${cells}`;
};

const main = async () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const srcPath = path.join(repoRoot, 'src', 'shapes.js');
  const dbPath = path.join(repoRoot, 'backend', 'data', 'shapes.json');

  let txt = await fs.readFile(srcPath, 'utf8');
  // make it require-able: replace export and append module.exports
  txt = txt.replace(/export\s+const\s+shapes\s*=/, 'const shapes =');
  txt += '\nmodule.exports = shapes;\n';

  const tmp = path.join(os.tmpdir(), `shapes-for-import-${Date.now()}.js`);
  await fs.writeFile(tmp, txt, 'utf8');

  // load shapes
  const shapesMap = require(tmp);
  if(!shapesMap || typeof shapesMap !== 'object'){
    throw new Error('Failed to load shapes from src/shapes.js');
  }

  // build shape objects
  const shapes = Object.entries(shapesMap).map(([name, coords])=>{
    const cells = (coords||[]).map(pair => ({ x: pair[0], y: pair[1] }));
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for(const c of cells){ minX=Math.min(minX,c.x); minY=Math.min(minY,c.y); maxX=Math.max(maxX,c.x); maxY=Math.max(maxY,c.y); }
    if(cells.length===0){ minX=0; minY=0; maxX=0; maxY=0; }
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    return {
      name: name,
      width,
      height,
      cells,
      rule: null,
      meta: { comments: [], name, width, height, originalHeader: null },
      id: makeId()
    };
  });

  // prefer DB when available, otherwise read JSON
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  let db = [];
  let dbClient = null;
  try {
    const clientPath = path.join(__dirname, 'dbClient.cjs');
    if (require('fs').existsSync(clientPath)) {
      dbClient = require(clientPath);
    }
  } catch (e) { dbClient = null; }
  if (dbClient) {
    db = await dbClient.getAllShapes();
  } else {
    try{ const dbtxt = await fs.readFile(dbPath, 'utf8'); db = JSON.parse(dbtxt||'[]'); }catch{ db = []; }
  }

  const existingSig = new Set(db.map(shapeSignature));
  let added = 0;
  for(const s of shapes){
    const sig = shapeSignature(s);
    if(existingSig.has(sig)) continue;
    db.push(s);
    existingSig.add(sig);
    added++;
  }

  if (dbClient) {
    await dbClient.writeShapes(db);
    console.log(`Imported ${added} shapes from src/shapes.js into database`);
  } else {
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`Imported ${added} shapes from src/shapes.js into ${dbPath}`);
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
