#!/usr/bin/env node
// Generate thumbnails named by shape name (slugified) instead of UUID.
// Output layout: backend/data/thumbnails/<size>/<scheme>/<sanitized-name>.(png|svg)
// Usage: node backend/scripts/generate-thumbnails-named.js --sizes=64,96,128 --out=backend/data/thumbnails

import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SIZES = [64, 96, 128];

function slugify(name) {
  if (!name || typeof name !== 'string') return null;
  // basic slug: lowercase, replace spaces and illegal chars with '-', remove multiple dashes
  return name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_+/\\]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

function makeSvg(cells, bounds, targetPx, color = '#1976d2') {
  const padding = 4;
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
  return `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">\n<rect width="100%" height="100%" fill="transparent" />\n${rects.join('\n')}\n</svg>`;
}

async function main() {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(scriptDir, '..');
    const dataFile = path.join(repoRoot, 'data', 'shapes.json');
  const defaultOut = path.join(repoRoot, 'data', 'thumbnails');

    const rawArgs = process.argv.slice(2);
    const sizesArg = rawArgs.find(a => a.startsWith('--sizes='));
    const outArg = rawArgs.find(a => a.startsWith('--out='));
    const schemesArg = rawArgs.find(a => a.startsWith('--schemes='));
    const colorArg = rawArgs.find(a => a.startsWith('--color='));

    const sizes = sizesArg ? sizesArg.split('=')[1].split(',').map(s => Number(s.trim())).filter(Boolean) : DEFAULT_SIZES;
    const outDir = outArg ? outArg.split('=')[1] : defaultOut;
    const schemesFilter = schemesArg ? schemesArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : null;
    const forcedColor = colorArg ? colorArg.split('=')[1] : null;

    // import color schemes
    const csPath = path.join(repoRoot, '..', 'src', 'model', 'colorSchemes.js');
    let colorSchemes = {};
    try {
      const mod = await import(`file://${csPath}`);
      colorSchemes = mod.colorSchemes || {};
    } catch (err) {
      console.warn('Could not import colorSchemes, defaulting to single scheme', err && err.message);
      colorSchemes = { default: { name: 'Default', background: '#000', getCellColor: () => '#1976d2' } };
    }

    const schemes = schemesFilter || Object.keys(colorSchemes);

    // remove outDir if exists
    if (existsSync(outDir)) {
      console.log('Removing existing directory', outDir);
      await fs.rm(outDir, { recursive: true, force: true });
    }

    // DB-first: require dbClient and abort if not available to avoid stale JSON
    let arr = null;
    try {
      const dbClient = await import('./dbClient.mjs');
      arr = await dbClient.getAllShapes();
    } catch (e) {
      console.error('This script requires the SQLite DB. Populate the DB and ensure backend/scripts/dbClient.mjs is available.');
      console.error('Run migration or imports (e.g. backend/scripts/import-lexicon-shapes.mjs or backend/scripts/bulk-import-all.mjs).');
      console.error('Import error:');
      console.error(e && (e.stack || e.message || e));
      process.exit(2);
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      console.error('No shapes found in the database. Aborting.');
      process.exit(2);
    }

    // prepare unique name assignment
    const used = new Set();
    function uniqueNameFor(nameCandidate, fallback) {
      let base = slugify(nameCandidate) || slugify(fallback) || 'shape';
      if (!base) base = 'shape';
      let candidate = base;
      let i = 1;
      while (used.has(candidate)) {
        candidate = `${base}-${i}`;
        i++;
      }
      used.add(candidate);
      return candidate;
    }

    // ensure output directories per size and scheme
    for (const size of sizes) {
      for (const schemeKey of schemes) {
        const dir = path.join(outDir, String(size), schemeKey);
        mkdirSync(dir, { recursive: true });
      }
    }

    // try to import sharp for PNG conversion
    let sharp = null;
    try {
      sharp = (await import('sharp')).default || (await import('sharp'));
    } catch (err) {
      console.warn('sharp not available; only SVG output will be written');
      sharp = null;
    }

    let written = 0;

    for (const s of arr) {
      const displayName = s.name || s.id || 'shape';
      const filenameBase = uniqueNameFor(displayName, s.id);
      const cells = Array.isArray(s.cells) ? s.cells : [];
      const bounds = computeBounds(cells);

      for (const size of sizes) {
        for (const schemeKey of schemes) {
          const scheme = colorSchemes[schemeKey] || { background: '#000', getCellColor: () => forcedColor || '#1976d2' };
          const color = forcedColor || (scheme.getCellColor ? (() => {
            try { return scheme.getCellColor(0,0); } catch (e) { return '#1976d2'; }
          })() : '#1976d2');
          const svg = makeSvg(cells, bounds, size, color);
          const dir = path.join(outDir, String(size), schemeKey);
          if (sharp) {
            const pngPath = path.join(dir, `${filenameBase}.png`);
            try {
              await sharp(Buffer.from(svg)).png().resize(size, size, { fit: 'contain' }).toFile(pngPath);
            } catch (e) {
              console.warn('sharp failed for', filenameBase, e && e.message);
            }
          } else {
            // Fallback: write SVG only when sharp is not available
            const svgPath = path.join(dir, `${filenameBase}.svg`);
            await fs.writeFile(svgPath, svg, 'utf8');
          }
        }
      }
      written++;
    }

    console.log(`Wrote thumbnails for ${written} shapes to ${outDir} (sizes: ${sizes.join(', ')}, schemes: ${schemes.join(', ')})`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to generate named thumbnails:', err);
    process.exit(2);
  }
}

main();
