#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(BACKEND_DIR, 'data', 'shapes.json');
const OUT_DIR = path.resolve(__dirname, '..', '..', 'public');

function computeBounds(cells = []) {
  if (!cells || cells.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 };
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
  return { minX, minY, maxX, maxY, width, height };
}

function makeSvg(cells, bounds, targetPx, bg = '#0b1220', color = '#ffd66b') {
  const padding = Math.max(6, Math.round(targetPx * 0.04));
  const { minX, minY, width, height } = bounds;
  const maxDim = Math.max(width, height);
  const cellPx = Math.max(1, Math.floor((targetPx - padding * 2) / maxDim));
  const svgW = width * cellPx + padding * 2;
  const svgH = height * cellPx + padding * 2;
  const rects = [];
  for (const c of cells) {
    const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
    const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
    const px = (x - minX) * cellPx + padding;
    const py = (y - minY) * cellPx + padding;
    rects.push(`<rect x="${px}" y="${py}" width="${cellPx}" height="${cellPx}" fill="${color}" />`);
  }
  const svg = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">\n<rect width="100%" height="100%" fill="${bg}" />\n${rects.join('\n')}\n</svg>`;
  return svg;
}

async function main() {
  // allow passing the shape name as the first CLI arg, default to 'pulsar'
  const args = process.argv.slice(2);
  const nameToFind = args[0] || 'pulsar';
  // DB-only: require dbClient and abort if not available to avoid using stale JSON
  let arr = null;
  try {
    const clientPath = path.join(__dirname, 'dbClient.cjs');
    if (!fs.existsSync(clientPath)) {
      throw new Error('dbClient.cjs not found');
    }
    const dbClient = require(clientPath);
    arr = await dbClient.getAllShapes();
  } catch (e) {
    console.error('This script requires the SQLite DB and backend/scripts/dbClient.cjs to be present.');
    console.error('Populate the DB (e.g. run import-lexicon-shapes.mjs or bulk-import-all.mjs) and retry.');
    process.exit(2);
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('No shapes found in the database. Aborting.');
    process.exit(2);
  }
  const found = arr.find(s => (s.name || '').toLowerCase() === nameToFind.toLowerCase());
  if (!found) {
    console.error('Shape not found:', nameToFind);
    process.exit(2);
  }
  const cells = Array.isArray(found.cells) ? found.cells : [];
  const bounds = computeBounds(cells);
  const sizes = [{name:'logo512.png', px:512}, {name:'logo192.png', px:192}, {name:'favicon.ico', px:48}];
  for (const s of sizes) {
    const svg = makeSvg(cells, bounds, s.px, '#0b1220', '#ffd66b');
    const out = path.join(OUT_DIR, s.name);
    await sharp(Buffer.from(svg)).png().resize(s.px, s.px, { fit: 'contain' }).toFile(out);
    console.log('Wrote', out);
  }
  console.log('Done writing logos for:', found.name);
}

main().catch(err => { console.error(err); process.exit(1); });
