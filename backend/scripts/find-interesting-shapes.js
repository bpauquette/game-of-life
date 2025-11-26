#!/usr/bin/env node
// Scan backend/data/shapes.json and report top shapes by cell count, density, and bounding box size

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function computeBounds(cells = []) {
  if (!cells || cells.length === 0) return { width: 1, height: 1, area: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
    const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  const width = (maxX - minX + 1) || 1;
  const height = (maxY - minY + 1) || 1;
  return { width, height, area: width * height };
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  let arr = null;
  // DB-first: require dbClient and fail if not available to avoid using stale JSON
  try {
    const dbClient = await import('./dbClient.mjs');
    arr = await dbClient.getAllShapes();
  } catch (e) {
    console.error('This script requires the SQLite DB. Populate the DB and ensure backend/scripts/dbClient.mjs is available.');
    console.error('Run migration or imports (e.g. backend/scripts/import-lexicon-shapes.mjs or backend/scripts/bulk-import-all.mjs).');
    process.exit(2);
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('No shapes found in the database. Aborting.');
    process.exit(2);
  }
  console.log('Total shapes:', arr.length);
  const stats = arr.map(s => {
    const cells = Array.isArray(s.cells) ? s.cells : [];
    const bounds = computeBounds(cells);
    const cellCount = cells.length;
    const density = cellCount / Math.max(1, bounds.area);
    return { id: s.id || null, name: s.name || '<unnamed>', cellCount, width: bounds.width, height: bounds.height, area: bounds.area, density };
  });

  const topByCells = [...stats].sort((a,b)=>b.cellCount - a.cellCount).slice(0,5);
  const topByArea = [...stats].sort((a,b)=>b.area - a.area).slice(0,5);
  const topByDensity = [...stats].sort((a,b)=>b.density - a.density).slice(0,5);

  console.log('\nTop 5 by cell count:');
  topByCells.forEach((s,i)=> console.log(`${i+1}. ${s.name} (id=${s.id}) cells=${s.cellCount} area=${s.area} size=${s.width}x${s.height} density=${s.density.toFixed(3)}`));

  console.log('\nTop 5 by area (bounding box):');
  topByArea.forEach((s,i)=> console.log(`${i+1}. ${s.name} (id=${s.id}) area=${s.area} cells=${s.cellCount} size=${s.width}x${s.height} density=${s.density.toFixed(3)}`));

  console.log('\nTop 5 by density (cells/area):');
  topByDensity.forEach((s,i)=> console.log(`${i+1}. ${s.name} (id=${s.id}) density=${s.density.toFixed(3)} cells=${s.cellCount} area=${s.area} size=${s.width}x${s.height}`));

  // pick a candidate: prefer interesting mix of size and pattern (top cell count)
  const candidate = topByCells[0];
  console.log('\nSuggested most interesting shape (by cell count):');
  console.log(`${candidate.name} (id=${candidate.id}) cells=${candidate.cellCount} size=${candidate.width}x${candidate.height} area=${candidate.area} density=${candidate.density.toFixed(3)}`);

  // where thumbnails can be found
  console.log('\nThumbnail locations (per-scheme 128px and named):');
  const thumbBase = path.join(scriptDir, '..', 'data', 'thumbnails');
  const namedBase = thumbBase; // named thumbnails are now under the same thumbnails directory
  console.log(`- per-scheme: ${thumbBase}/<scheme>/${candidate.id}.png  (or .svg)`);
  console.log(`- named: ${namedBase}/128/<scheme>/${candidate.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`);
}

main().catch(e=>{ console.error(e); process.exit(2); });
