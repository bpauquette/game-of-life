#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.resolve(__dirname, '..', '..', 'public');
const srcPng = path.join(publicDir, 'logo512.png');
const outIco = path.join(publicDir, 'favicon.ico');

const sizes = [256, 128, 64, 48, 32, 16];

async function makeBuffers() {
  if (!fs.existsSync(srcPng)) throw new Error('source PNG not found: ' + srcPng);
  const buffers = [];
  for (const s of sizes) {
    const buf = await sharp(srcPng).resize(s, s, { fit: 'contain' }).png().toBuffer();
    buffers.push({ size: s, buf });
  }
  return buffers;
}

function writeIco(buffers) {
  // ICONDIR header: reserved(2) = 0, type(2)=1, count(2)
  const count = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntrySize = 16;
  const entries = Buffer.alloc(dirEntrySize * count);
  let offset = header.length + entries.length;
  for (let i = 0; i < count; i++) {
    const { size, buf } = buffers[i];
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(w, 0); // width
    entry.writeUInt8(h, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(0, 4); // color planes (0 for PNG)
    entry.writeUInt16LE(0, 6); // bit count (0 for PNG)
    entry.writeUInt32LE(buf.length, 8); // bytes in resource
    entry.writeUInt32LE(offset, 12); // image offset
    entry.copy(entries, i * dirEntrySize);
    offset += buf.length;
  }

  const out = Buffer.concat([header, entries, ...buffers.map(b => b.buf)]);
  fs.writeFileSync(outIco, out);
}

(async function main(){
  try {
    const bufs = await makeBuffers();
    writeIco(bufs);
    console.log('Wrote ICO to', outIco);
  } catch (err) {
    console.error('Failed to create ico:', err);
    process.exit(1);
  }
})();
