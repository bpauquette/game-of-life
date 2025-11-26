import fs from 'fs';
const files = fs.readdirSync('all');
const rle = files.filter(f => f.endsWith('.rle'));
console.log('RLE files found:', rle.length);
console.log('First 5:', rle.slice(0,5));