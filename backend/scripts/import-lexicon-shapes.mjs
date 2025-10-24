#!/usr/bin/env node
// Import lexicon.txt to shapes.json with geometry and cleaned description
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRLE } from '../src/rleParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEXICON_FILE = path.join(__dirname, '..', 'lexicon', 'lexicon.txt');
const SHAPES_FILE = path.join(__dirname, '../data/shapes.json');

function parseDotAsteriskPattern(lines) {
  const cells = [];
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      if (line[x] === '*') {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function calculateDimensions(cells) {
  if (cells.length === 0) return { width: 1, height: 1 };
  const minX = Math.min(...cells.map(c => c.x));
  const maxX = Math.max(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  const maxY = Math.max(...cells.map(c => c.y));
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

function normalizeCells(cells) {
  if (cells.length === 0) return cells;
  const minX = Math.min(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  return cells.map(c => ({ x: c.x - minX, y: c.y - minY }));
}

function parseDefinitionLine(line) {
  const match = line.match(/^:([^:]+):\s*(\([^)]+\))?\s*(.*)$/);
  if (!match) return null;
  const [, name, metadata, description] = match;
  return {
    name: name.trim(),
    metadata: metadata ? metadata.slice(1, -1) : '',
    description: description.trim()
  };
}

async function parseLexicon() {
  const content = await fs.readFile(LEXICON_FILE, 'utf8');
  const lines = content.split('\n');
  const patterns = [];
  let currentPattern = null;
  let patternLines = [];
  let inPattern = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (line.startsWith(':') && line.includes(':')) {
      if (currentPattern && patternLines.length > 0) {
        let cells = [];
        const hasRLE = patternLines.some(l => l.includes('x = ') && l.includes('y = '));
        if (hasRLE) {
          const rleStart = patternLines.findIndex(l => l.includes('x = '));
          if (rleStart >= 0) {
            const rleLines = patternLines.slice(rleStart);
            const rleText = rleLines.join('\n');
            try {
              const parsed = parseRLE(rleText);
              cells = parsed.cells || [];
            } catch {}
          }
        } else {
          const dotLines = patternLines.filter(l => l.includes('.') && l.includes('*') && l.startsWith('\t')).map(l => l.substring(1));
          if (dotLines.length > 0) {
            cells = parseDotAsteriskPattern(dotLines);
          }
        }
        if (cells.length > 0) {
          cells = normalizeCells(cells);
          const dimensions = calculateDimensions(cells);
          patterns.push({
            ...currentPattern,
            cells,
            width: dimensions.width,
            height: dimensions.height
          });
        }
      }
      const parsed = parseDefinitionLine(line);
      if (parsed) {
        currentPattern = parsed;
        patternLines = [];
        inPattern = true;
      }
    } else if (currentPattern && inPattern) {
      if (line.startsWith('\t') || line.includes('x = ') || line.includes('$') || line.includes('!')) {
        patternLines.push(line);
      } else if (trimmed === '' || line.startsWith(':')) {
        inPattern = false;
      } else {
        patternLines.push(line);
      }
    }
  }
  if (currentPattern && patternLines.length > 0) {
    let cells = [];
    const hasRLE = patternLines.some(l => l.includes('x = ') && l.includes('y = '));
    if (hasRLE) {
      const rleStart = patternLines.findIndex(l => l.includes('x = '));
      if (rleStart >= 0) {
        const rleLines = patternLines.slice(rleStart);
        const rleText = rleLines.join('\n');
        try {
          const parsed = parseRLE(rleText);
          cells = parsed.cells || [];
        } catch {}
      }
    } else {
      const dotLines = patternLines.filter(l => l.includes('.') && l.includes('*') && l.startsWith('\t')).map(l => l.substring(1));
      if (dotLines.length > 0) {
        cells = parseDotAsteriskPattern(dotLines);
      }
    }
    if (cells.length > 0) {
      cells = normalizeCells(cells);
      const dimensions = calculateDimensions(cells);
      patterns.push({
        ...currentPattern,
        cells,
        width: dimensions.width,
        height: dimensions.height
      });
    }
  }
  return patterns;
}

async function main() {
  const patterns = await parseLexicon();
  // Clean description: remove * and . and duplicate whitespace
  for (const p of patterns) {
    p.description = p.description.replace(/[*.]/g, '').replace(/\s+/g, ' ').trim();
  }
  await fs.writeFile(SHAPES_FILE, JSON.stringify(patterns, null, 2), 'utf8');
  console.log(`Wrote ${patterns.length} shapes to shapes.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
