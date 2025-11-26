#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readShapes() {
  // prefer DB client when available
  try {
    const clientPath = path.join(__dirname, 'dbClient.cjs');
    if (fs.existsSync(clientPath)) {
      const dbClient = require(clientPath);
      return dbClient.getAllShapes();
    }
  } catch (e) { }
  const p = path.join(__dirname, '..', 'data', 'shapes.json');
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

function computeBounds(cells) {
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
  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  return { minX, minY, maxX, maxY, width, height };
}

function toKey(x, y) { return `${x},${y}`; }

function applyTransform(x, y, cx, cy, t) {
  const dx = x - cx;
  const dy = y - cy;
  let rx, ry;
  switch (t) {
    case 'rot90': rx = -dy; ry = dx; break;
    case 'rot180': rx = -dx; ry = -dy; break;
    case 'rot270': rx = dy; ry = -dx; break;
    case 'flipH': rx = -dx; ry = dy; break;
    case 'flipV': rx = dx; ry = -dy; break;
    case 'diag1': rx = dy; ry = dx; break;
    case 'diag2': rx = -dy; ry = -dx; break;
    default: rx = dx; ry = dy;
  }
  return [rx + cx, ry + cy];
}

function isIntegerClose(v) { return Math.abs(v - Math.round(v)) < 1e-6; }

function symmetryScore(cells) {
  if (!cells || cells.length === 0) return { score: 0, details: {} };
  const bounds = computeBounds(cells);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const set = new Set(cells.map(c => toKey((typeof c.x !== 'undefined') ? c.x : c[0], (typeof c.y !== 'undefined') ? c.y : c[1])));
  const transforms = ['rot90','rot180','rot270','flipH','flipV','diag1','diag2'];
  const details = {};
  let totalMatches = 0;
  for (const t of transforms) {
    let matches = 0;
    for (const c of cells) {
      const x = (typeof c.x !== 'undefined') ? c.x : c[0];
      const y = (typeof c.y !== 'undefined') ? c.y : c[1];
      const [tx, ty] = applyTransform(x, y, cx, cy, t);
      if (!isIntegerClose(tx) || !isIntegerClose(ty)) continue;
      const k = toKey(Math.round(tx), Math.round(ty));
      if (set.has(k)) matches++;
    }
    const ratio = matches / cells.length;
    details[t] = { matches, ratio };
    if (ratio > 0.999999) totalMatches += 1;
  }
  return { score: totalMatches, details, bbox: bounds };
}

function displayScore(cellCount, bbox) {
  const maxDim = Math.max(bbox.width, bbox.height);
  return cellCount / (1 + Math.log1p(maxDim));
}

function main() {
  const args = process.argv.slice(2);
  const topArg = args.find(a => a.startsWith('--top='));
  const top = Number(topArg ? topArg.split('=')[1] : 20) || 20;
  const shapes = readShapes();
  const results = [];
  for (const s of shapes) {
    const cells = Array.isArray(s.cells) ? s.cells : [];
    if (!cells || cells.length === 0) continue;
    const sc = symmetryScore(cells);
    const dscore = displayScore(cells.length, sc.bbox);
    results.push({ id: s.id || null, name: s.name || '(anon)', cellCount: cells.length, symmetry: sc.score, details: sc.details, bbox: sc.bbox, displayScore: dscore });
  }
  results.sort((a,b) => {
    if (b.symmetry !== a.symmetry) return b.symmetry - a.symmetry;
    if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
    return b.cellCount - a.cellCount;
  });
  const out = results.slice(0, top);
  console.log(JSON.stringify(out, null, 2));
}

main();
