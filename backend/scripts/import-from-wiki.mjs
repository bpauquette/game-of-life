import fetch from 'node-fetch';
import { parseRLE } from '../src/rleParser.js';
import db from '../src/db.js';
import { generateThumbnailsForShape } from '../src/thumbnailGenerator.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeId = () => uuidv4();

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 200);

const ensureUniqueName = async (name) => {
  let candidate = name;
  let counter = 1;
  while (await db.getShapeByName(candidate)) {
    candidate = `${name} ${counter}`;
    counter++;
  }
  return candidate;
};

const extractRLEFromHTML = (html) => {
  // Look for RLE in various formats
  // First, try to find x = ..., y = ..., rule = B3/S23
  const rleRegex = /x\s*=\s*\d+,\s*y\s*=\s*\d+,\s*rule\s*=\s*B3\/S23[\s\S]*?(?=\n\n|$)/g;
  let match = rleRegex.exec(html);
  if (match) {
    return match[0].trim();
  }

  // Alternative: look for #N followed by pattern
  const altRegex = /#N\s+[^\n]+\n[\s\S]*?(?=\n\n|$)/g;
  match = altRegex.exec(html);
  if (match) {
    return match[0].trim();
  }

  // Look in script tags or data attributes
  const scriptRegex = /"rle"\s*:\s*"([^"]+)"/g;
  match = scriptRegex.exec(html);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  return null;
};

const importFromWiki = async (input) => {
  let rleText;
  if (input.startsWith('http')) {
    console.log(`Fetching ${input}...`);
    const response = await fetch(input, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${input}: ${response.status}`);
    }
    const html = await response.text();

    console.log('Extracting RLE...');
    rleText = extractRLEFromHTML(html);
    if (!rleText) {
      throw new Error('Could not find RLE in the page');
    }
  } else {
    rleText = input;
  }

  console.log('Parsing RLE...');
  const shape = parseRLE(rleText);
  shape.id = makeId();

  if (shape.name) {
    shape.name = await ensureUniqueName(shape.name);
  } else {
    if (customName) {
      shape.name = customName;
    } else {
      // For URL, extract name from URL
      if (input.startsWith('http')) {
        const urlMatch = input.match(/\/wiki\/([^/?#]+)/);
        if (urlMatch) {
          shape.name = urlMatch[1].replace(/_/g, ' ');
        }
      } else {
        shape.name = 'Imported Pattern';
      }
    }
    shape.name = await ensureUniqueName(shape.name);
  }

  shape.meta = shape.meta || {};
  shape.meta.importedAt = new Date().toISOString();
  shape.meta.source = 'wiki-import';
  shape.userId = 'system-user'; // Set to system user

  console.log(`Adding shape: ${shape.name}`);
  await db.addShape(shape);

  console.log('Generating thumbnail...');
  await generateThumbnailsForShape(shape);

  console.log('Import successful!');
  return shape;
};

// Main
const input = process.argv[2];
const customName = process.argv[3];
if (!input) {
  console.error('Usage: node import-from-wiki.mjs <wiki-url-or-rle> [name]');
  console.error('Examples:');
  console.error('  node import-from-wiki.mjs "https://conwaylife.com/wiki/Galumpher"');
  console.error('  node import-from-wiki.mjs "x = 39, y = 33, rule = B3/S23\\n39bo..." "Galumpher"');
  process.exit(1);
}

importFromWiki(input).then((shape) => {
  console.log(`Imported: ${shape.name} (${shape.id})`);
}).catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});