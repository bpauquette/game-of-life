import { readFileSync } from 'fs';
import { parseRLE, parseCells } from './src/rleParser.js';

const cellsText = readFileSync('all/101.cells', 'utf8');
const rleText = readFileSync('all/101.rle', 'utf8');

console.log('Cells text first grid line:', cellsText.split('\n').find(line => !line.trim().startsWith('!') && line.trim()));

const cellsParsed = parseCells(cellsText);
const rleParsed = parseRLE(rleText);

console.log('Cells parsed:', cellsParsed.cells.length, 'cells');
console.log('RLE parsed:', rleParsed.cells.length, 'cells');

console.log('Cells equal:', JSON.stringify(cellsParsed.cells) === JSON.stringify(rleParsed.cells));

console.log('Cells from .cells:', cellsParsed.cells.slice(0,5));
console.log('Cells from .rle:', rleParsed.cells.slice(0,5));