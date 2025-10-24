#!/usr/bin/env node
// Script to empty shapes-catalog and reimport from lexicon.txt with descriptions
const fs = require('fs');
const path = require('path');

const SHAPES_PATH = path.join(__dirname, '../data/shapes.json');
const LEXICON_PATH = path.join(__dirname, '../lexicon/lexicon.txt');

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
      current.description = desc.join(' ').replace(/\s+/g, ' ').trim();
      i = j - 1;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function main() {
  // Empty shapes.json
  fs.writeFileSync(SHAPES_PATH, '[]', 'utf8');

  // Read lexicon
  const lexicon = fs.readFileSync(LEXICON_PATH, 'utf8');
  const entries = parseLexicon(lexicon);

  // Import all, then remove '*' and '.' from description
  const shapes = entries.map(e => ({
    name: e.name,
    description: e.description.replace(/[*.]/g, '')
  }));
  fs.writeFileSync(SHAPES_PATH, JSON.stringify(shapes, null, 2), 'utf8');
  console.log(`Imported ${shapes.length} shapes with cleaned descriptions.`);
}

if (require.main === module) main();
