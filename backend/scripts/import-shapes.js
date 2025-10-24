#!/usr/bin/env node
const fs = require('node:fs').promises;
const path = require('node:path');

const makeId = () => {
  return `${Date.now()}-${Math.floor(Math.random()*100000)}`;
};

const readJson = async (p) => {
  const txt = await fs.readFile(p, 'utf8');
  return JSON.parse(txt || '[]');
};

const writeJson = async (p, data) => {
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
};

const shapeSignature = (s) => {
  // signature based on name and sorted cells for simple dedupe
  const cells = (s.cells || []).map(c => `${c.x},${c.y}`).sort().join('|');
  return `${s.name||''}::${cells}`;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const src = argv[0] || path.join(__dirname, '..', 'data', 'shapes.json');
  const dst = argv[1] || path.join(__dirname, '..', 'data', 'shapes.json');
  const dry = argv.includes('--dry-run') || argv.includes('-n');

  console.log(`Source: ${src}`);
  console.log(`Dest:   ${dst}`);
  console.log(dry? 'Dry run: no file will be written' : 'Merging and writing to dest');

  const srcData = await readJson(src);
  const dstData = await readJson(dst);

  const existingById = new Set(dstData.map(s => s.id).filter(Boolean));
  const existingSig = new Set(dstData.map(shapeSignature));

  let added = 0;
  for(const s of srcData){
    if(s.id && existingById.has(s.id)) continue;
    const sig = shapeSignature(s);
    if(existingSig.has(sig)) continue;
    const shape = { ...s };
    if(!shape.id) shape.id = makeId();
    shape.meta = shape.meta || {};
    shape.meta.importedAt = shape.meta.importedAt || (new Date()).toISOString();
    dstData.push(shape);
    existingById.add(shape.id);
    existingSig.add(sig);
    added++;
  }

  console.log(`Found ${srcData.length} shapes in source; ${dstData.length - added} already present; ${added} to add.`);
  if(added>0 && !dry){
    await writeJson(dst, dstData);
    console.log('Write complete.');
  }
}

main().catch(err=>{ console.error(err); process.exit(1); });
