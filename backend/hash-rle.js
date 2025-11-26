import crypto from 'crypto';
import { readFileSync } from 'fs';

const rleText = readFileSync('all/101.rle', 'utf8');
const hash = crypto.createHash('sha256').update(rleText).digest('hex');
console.log('Hash of RLE text:', hash);