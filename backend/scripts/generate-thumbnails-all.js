#!/usr/bin/env node
// Generate thumbnails for every color scheme by invoking the lower-level generator
// Each scheme will be written to backend/data/thumbnails/<schemeKey>/

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import color schemes from the frontend model so we match exactly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const colorSchemesPath = path.join(repoRoot, '..', 'src', 'model', 'colorSchemes.js');

let colorSchemes = {};
try {
  // dynamic import of ES module file
  const mod = await import(`file://${colorSchemesPath}`);
  colorSchemes = mod.colorSchemes || {};
} catch (err) {
  console.error('Failed to import colorSchemes from', colorSchemesPath, err);
  process.exit(2);
}

const backendDir = path.join(repoRoot);
// use the named generator (writes to backend/data/thumbnails by default)
const generatorPath = path.join(backendDir, 'scripts', 'generate-thumbnails-named.js');

const SIZE = 128;

console.log('Found color schemes:', Object.keys(colorSchemes).join(', '));

for (const [key, scheme] of Object.entries(colorSchemes)) {
  // choose a representative color: prefer getCellColor(0,0) if available, else background
  let sampleColor = scheme.background || '#1976d2';
  try {
    if (typeof scheme.getCellColor === 'function') {
      sampleColor = scheme.getCellColor(0, 0) || sampleColor;
    }
  } catch (err) {
    // ignore; fall back to background
  }

  console.log(`Generating thumbnails for scheme=${key} color=${sampleColor}`);

  const args = [generatorPath, `--size=${SIZE}`, `--color=${sampleColor}`, `--out-subdir=${key}`];
  const res = spawnSync(process.execPath, args, { cwd: backendDir, stdio: 'inherit' });
  if (res.error) {
    console.error('Error spawning generator for', key, res.error);
  }
  if (res.status !== 0) {
    console.warn(`Generator for scheme=${key} exited with status=${res.status}`);
  }
}

console.log('All schemes processed. Thumbnails are under backend/data/thumbnails/<size>/<scheme>/');
