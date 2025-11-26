#!/usr/bin/env node
// Analyze shapes.json for bounding box widths/heights and cell counts
// Outputs percentiles to help choose thumbnail sizes.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const v = sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  return Math.round(v);
}

async function main() {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    // DB-first: require dbClient and abort if not available
    let arr = null;
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
    const widths = [];
    const heights = [];
    const maxDims = [];
    const cellCounts = [];

    for (const s of arr) {
      const cells = Array.isArray(s.cells) ? s.cells : [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of cells) {
        const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
        const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (!Number.isFinite(minX)) { minX = minY = maxX = maxY = 0; }
      const w = (maxX - minX + 1) || 1;
      const h = (maxY - minY + 1) || 1;
      widths.push(w);
      heights.push(h);
      maxDims.push(Math.max(w, h));
      cellCounts.push(cells.length);
    }

    widths.sort((a,b)=>a-b);
    heights.sort((a,b)=>a-b);
    maxDims.sort((a,b)=>a-b);
    cellCounts.sort((a,b)=>a-b);

    const qs = [50, 75, 90, 95, 99];
    console.log('Shapes analyzed:', arr.length);
    console.log('Percentiles (width / height / maxDim / cells):');
    for (const q of qs) {
      console.log(`${q}th: ${percentile(widths, q)} / ${percentile(heights, q)} / ${percentile(maxDims, q)} / ${percentile(cellCounts, q)}`);
    }

    // Suggest thumbnail sizes by mapping maxDim -> pixel size with reasonable cell pixel sizes
    // We'll assume a target cellPixel between 3 and 6 depending on desired clarity.
    const recommend = [ {name:'small', cellPx:3}, {name:'medium', cellPx:4}, {name:'large', cellPx:6} ];
    console.log('\nRecommendations (approx image pixel size for maxDim percentiles):');
    for (const r of recommend) {
      console.log(`\n${r.name} (cellPx = ${r.cellPx}):`);
      for (const q of [50,75,90]) {
        const dim = percentile(maxDims, q);
        const px = dim * r.cellPx + 8; // padding approx
        console.log(` ${q}th -> ${dim} cells -> ~${px}px`);
      }
    }

    console.log('\nSuggested starting thumbnail sizes to test: 64px, 96px, 128px.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to run study:', err);
    process.exit(2);
  }
}

main();
