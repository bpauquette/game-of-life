#!/usr/bin/env node
// One-time script to ensure every shape in backend/data/shapes.json has a stable UUID id.
// Usage: node backend/scripts/ensure-shape-ids.js

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const dataFile = path.join(scriptDir, '..', 'data', 'shapes.json');
    const backupFile = path.join(scriptDir, '..', 'data', `shapes.json.bak.${Date.now()}`);

    console.log('Reading shapes from', dataFile);
    const txt = await fs.readFile(dataFile, 'utf8').catch(() => null);
    if (!txt) {
      console.error('No shapes.json found or file is empty:', dataFile);
      process.exit(1);
    }

    const arr = JSON.parse(txt || '[]');
    if (!Array.isArray(arr)) {
      console.error('Expected an array in shapes.json');
      process.exit(1);
    }

    const updated = [];
    for (const s of arr) {
      if (s && typeof s === 'object' && !s.id) {
        s.id = uuidv4();
        updated.push(s);
      }
    }

    if (updated.length === 0) {
      console.log('All shapes already have ids. Nothing to do.');
      process.exit(0);
    }

    // Backup original file
    await fs.writeFile(backupFile, txt, 'utf8');
    console.log('Backed up original shapes.json to', backupFile);

    // Write updated file
    await fs.writeFile(dataFile, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`Assigned ids to ${updated.length} shapes and wrote updated file to ${dataFile}`);
    console.log('Example assignments (first 5):');
    for (let i = 0; i < Math.min(5, updated.length); i++) {
      const s = updated[i];
      console.log(` - ${s.name || '<unnamed>'}: ${s.id}`);
    }

    console.log('Done. You may want to commit the updated data file to version control.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure shape ids:', err);
    process.exit(2);
  }
}

// Execute script
main();
