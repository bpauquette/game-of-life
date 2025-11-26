import { parseLexiconFile } from './src/lexiconParser.js';

async function test() {
  try {
    const entries = await parseLexiconFile('./lexicon/lexicon.txt');
    console.log(`Parsed ${entries.length} entries`);
    const patterns = entries.filter(e => e.type === 'pattern');
    console.log(`Patterns: ${patterns.length}`);
    const withCells = patterns.filter(e => e.cells && e.cells.length > 0);
    console.log(`With cells: ${withCells.length}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();