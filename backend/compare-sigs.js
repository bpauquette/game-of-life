import { readFileSync } from 'fs';
import { parseRLE, parseCells } from './src/rleParser.js';
import { generateShapeSignatureFromCells } from './src/shapeSignature.js';

const cellsText = readFileSync('all/101.cells', 'utf8');
const rleText = readFileSync('all/101.rle', 'utf8');

const cellsParsed = parseCells(cellsText);
const rleParsed = parseRLE(rleText);

const sigCells = generateShapeSignatureFromCells(cellsParsed.cells);
const sigRle = generateShapeSignatureFromCells(rleParsed.cells);

console.log('Signature from cells file:', sigCells);
console.log('Signature from rle file:', sigRle);
console.log('Equal:', sigCells === sigRle);