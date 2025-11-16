#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp is required to run this script. Please install it in the backend (npm i sharp)');
  process.exit(1);
}

const outDir = path.resolve(__dirname, '..', '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#ffd66b" />
      <stop offset="60%" stop-color="#ff7aa2" />
      <stop offset="100%" stop-color="#6b7bff" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0b1220" />
  <g transform="translate(128,128)" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2">
    <g id="petals">
      <ellipse rx="28" ry="68" transform="translate(0,-64)" />
    </g>
    <g>
      <use href="#petals" transform="rotate(0)" />
      <use href="#petals" transform="rotate(60)" />
      <use href="#petals" transform="rotate(120)" />
      <use href="#petals" transform="rotate(180)" />
      <use href="#petals" transform="rotate(240)" />
      <use href="#petals" transform="rotate(300)" />
    </g>
    <circle r="36" fill="#ffffff" />
  </g>
</svg>`;

async function writePng(filename, size) {
  const out = path.join(outDir, filename);
  await sharp(Buffer.from(svg)).resize(size, size, { fit: 'cover' }).png().toFile(out);
  console.log('Wrote', out);
}

async function main() {
  try {
    await writePng('logo512.png', 512);
    await writePng('logo192.png', 192);
    await writePng('favicon.ico', 48);
    console.log('All done.');
  } catch (err) {
    console.error('Failed to write logos:', err);
    process.exit(1);
  }
}

main();
