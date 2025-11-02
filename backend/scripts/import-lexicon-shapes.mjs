#!/usr/bin/env node
// Import lexicon.txt to shapes.json using centralized parser
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexiconFile } from '../src/lexiconParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_FILE = path.join(__dirname, '..', 'lexicon', 'lexicon.txt');
const SHAPES_FILE = path.join(__dirname, '../data/shapes.json');

async function main() {
  const patterns = await parseLexiconFile(LEXICON_FILE);
  await fs.writeFile(SHAPES_FILE, JSON.stringify(patterns, null, 2), 'utf8');
  console.log(`Wrote ${patterns.length} shapes to shapes.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
