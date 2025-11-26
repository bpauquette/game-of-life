import fs from 'node:fs/promises';
import path from 'node:path';

const dir = 'all';
const files = await fs.readdir(dir);
console.log(`Files in ${dir}: ${files.length}`);
console.log(files.slice(0, 10).join(', '));
const rleFiles = files.filter(f => f.endsWith('.rle'));
console.log(`RLE files: ${rleFiles.length}`);
console.log(rleFiles.slice(0, 10).join(', '));