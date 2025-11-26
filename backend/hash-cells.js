import crypto from 'crypto';
import { readFileSync } from 'fs';

const cellsText = readFileSync('all/101.cells', 'utf8');
const hash = crypto.createHash('sha256').update(cellsText).digest('hex');
console.log('Hash of cells text:', hash);