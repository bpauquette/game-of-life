import { readFileSync } from 'fs';
import { parseRLE, parseCells } from './src/rleParser.js';

const names = ['block', 'glider', 'clock'];

for (const name of names) {
  try {
    const cellsText = readFileSync(`all/${name}.cells`, 'utf8');
    const rleText = readFileSync(`all/${name}.rle`, 'utf8');

    const cellsParsed = parseCells(cellsText);
    const rleParsed = parseRLE(rleText);

    const same = JSON.stringify(cellsParsed.cells) === JSON.stringify(rleParsed.cells);
    console.log(`${name}: cells equal: ${same}, cells count: ${cellsParsed.cells.length}`);
  } catch (e) {
    console.log(`${name}: error ${e.message}`);
  }
}