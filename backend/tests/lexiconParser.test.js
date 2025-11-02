import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexiconFile, parseLexiconText } from '../src/lexiconParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEX_PATH = path.join(__dirname, '..', 'lexicon', 'lexicon.txt');

// Helper: find a pattern by name (case-insensitive)
function findByName(list, name) {
  const lc = name.toLowerCase();
  return list.find(p => p.name.toLowerCase() === lc);
}

// Basic smoke test on a small synthetic snippet
{
  const text = `:foo: (p2) First sentence.\n  Second sentence.\n\t.*\n\t**\n`; 
  const patterns = parseLexiconText(text);
  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].name, 'foo');
  assert.match(patterns[0].description, /First sentence\./);
  assert.match(patterns[0].description, /Second sentence\./);
  assert.equal(patterns[0].cells.length > 0, true);
}

// Read the real lexicon and check a couple of known entries
const patterns = await parseLexiconFile(LEX_PATH);

// 1) Glider should include multiple-sentence description and no raw diagrams
{
  const glider = findByName(patterns, 'glider');
  assert.ok(glider, 'glider entry exists');
  assert.ok(glider.description.length > 40, 'glider description seems non-trivial');
  assert.match(glider.description, /The smallest, most common and first/);
  assert.doesNotMatch(glider.description, /\*\*\*|\*\.\.|\.[*.]/, 'diagram characters should not appear in description');
}

// 2) Block entry exists and has geometry
{
  const block = findByName(patterns, 'block');
  assert.ok(block, 'block entry exists');
  assert.ok(block.cells.length > 0, 'block has cells');
  assert.ok(block.width >= 2 && block.height >= 2, 'block has reasonable dimensions');
}
