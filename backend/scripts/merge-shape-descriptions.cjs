#!/usr/bin/env node
// Merge lexicon descriptions into original shapes.json, preserving all shape data
const fs = require('fs');
const path = require('path');

const SHAPES_PATH = path.join(__dirname, '../data/shapes.json');
const LEXICON_PATH = path.join(__dirname, '../lexicon/lexicon.txt');
const SHAPES_ORIG_PATH = path.join(__dirname, '../data/shapes.orig.json');

// Helper: parse lexicon.txt for shape entries and descriptions
function parseLexicon(text) {
  const entries = [];
  const lines = text.split(/\r?\n/);
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^:([^:]+):/);
    if (match) {
      if (current) entries.push(current);
      current = { name: match[1].trim(), description: '' };
      // Collect all following indented or blank lines as description
      let desc = [];
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        if (/^:[^:]+:/.test(l)) break; // next entry
        if (l.trim() === '' && desc.length > 0 && lines[j+1] && lines[j+1].startsWith(':')) break; // blank before next entry
        if (l.trim() !== '' || desc.length > 0) desc.push(l.replace(/^\s+/,''));
        j++;
      }
      current.description = desc.join(' ').replace(/[*.]/g, '').replace(/\s+/g, ' ').trim();
      i = j - 1;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function main() {
  // Backup original shapes.json if not already backed up
  if (!fs.existsSync(SHAPES_ORIG_PATH)) {
    fs.copyFileSync(SHAPES_PATH, SHAPES_ORIG_PATH);
    console.log('Backed up original shapes.json to shapes.orig.json');
  }
  // Read original shapes
  const shapes = JSON.parse(fs.readFileSync(SHAPES_ORIG_PATH, 'utf8'));
  // Read lexicon
  const lexicon = fs.readFileSync(LEXICON_PATH, 'utf8');
  const entries = parseLexicon(lexicon);
  // Build a map for fast lookup (case-insensitive)
  const descMap = new Map(entries.map(e => [e.name.toLowerCase(), e.description]));
  // Merge descriptions into shapes
  let count = 0;
  for (const shape of shapes) {
    const desc = descMap.get(shape.name.toLowerCase());
    if (desc) {
      // Remove duplicate whitespace in the description
      shape.description = desc.replace(/\s+/g, ' ').trim();
      count++;
    } else {
      shape.description = '';
    }
  }
  fs.writeFileSync(SHAPES_PATH, JSON.stringify(shapes, null, 2), 'utf8');
  console.log(`Merged descriptions into ${count} shapes (total: ${shapes.length}).`);
}

if (require.main === module) main();
