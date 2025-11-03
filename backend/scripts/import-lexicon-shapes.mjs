#!/usr/bin/env node
// Import lexicon.txt to shapes.json using centralized parser
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexiconFile } from '../src/lexiconParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_FILE = path.join(__dirname, '..', 'lexicon', 'lexicon.txt');
const DATA_DIR = path.join(__dirname, '../data');
const SHAPES_FILE = path.join(DATA_DIR, 'shapes.json');
const ALIASES_FILE = path.join(DATA_DIR, 'aliases.json');
const TERMS_FILE = path.join(DATA_DIR, 'terms.json');

async function main() {
  const entries = await parseLexiconFile(LEXICON_FILE);
  const shapes = entries.filter(e => e.type === 'pattern' && e.cells && e.cells.length > 0);
  const aliases = entries
    .filter(e => e.type === 'alias' || e.type === 'crossref')
    .map(e => ({ name: e.name, aliasOf: e.aliasOf, type: e.type, description: e.description }));
  const terms = entries
    .filter(e => e.type === 'concept')
    .map(e => ({ name: e.name, description: e.description }));

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SHAPES_FILE, JSON.stringify(shapes, null, 2), 'utf8');
  await fs.writeFile(ALIASES_FILE, JSON.stringify(aliases, null, 2), 'utf8');
  await fs.writeFile(TERMS_FILE, JSON.stringify(terms, null, 2), 'utf8');

  console.log(`Parsed ${entries.length} entries`);
  console.log(`- Wrote ${shapes.length} patterns to shapes.json`);
  console.log(`- Wrote ${aliases.length} aliases/crossrefs to aliases.json`);
  console.log(`- Wrote ${terms.length} terms to terms.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
