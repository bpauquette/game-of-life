// ESM parser for Life Lexicon (ASCII) producing full descriptions and geometry
import { promises as fs } from 'node:fs';

import { parseRLE } from './rleParser.js';

function parseDotAsteriskPattern(lines) {
  const cells = [];
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      if (line[x] === '*') cells.push({ x, y });
    }
  }
  return cells;
}

function normalizeCells(cells) {
  if (!cells || cells.length === 0) return [];
  const minX = Math.min(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  return cells.map(c => ({ x: c.x - minX, y: c.y - minY }));
}

function dims(cells) {
  if (!cells || cells.length === 0) return { width: 1, height: 1 };
  const xs = cells.map(c => c.x);
  const ys = cells.map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

function parseDefinitionLine(line) {
  const m = line.match(/^:([^:]+):\s*(\([^)]+\))?\s*(.*)$/);
  if (!m) return null;
  const [, name, meta, tail] = m;
  return { name: name.trim(), metadata: meta ? meta.slice(1, -1) : '', headDescription: tail.trim() };
}

// Given the lexicon file contents, parse to pattern objects with full description
export function parseLexiconText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let current = null;
  let buffer = [];
  const flush = () => {
    if (!current) return;
    // Split buffer into description vs diagram/RLE
    const textLines = [];
    const patternLines = [];
    for (const l of buffer) {
      const trimmed = l.trimEnd();
      const isRLEMeta = /\bx\s*=\s*\d+\s*,\s*y\s*=\s*\d+/.test(trimmed) || trimmed.includes('!');
      const isDiagram = (l.startsWith('\t') || /^\s/.test(l)) && /^[.*\s]+$/.test(trimmed);
      if (isRLEMeta || isDiagram) {
        patternLines.push(l);
      } else {
        textLines.push(l);
      }
    }

    // Compute full description
    const descJoined = [current.headDescription, ...textLines]
      .filter(Boolean)
      .map(s => s.replace(/^\s+/, ''))
      .join(' ')
      .replaceAll(/\s+/g, ' ')
      .trim();

    // Parse geometry (RLE preferred, else dot-asterisk)
    let cells = [];
    const rleStart = patternLines.findIndex(l => /\bx\s*=\s*\d+\s*,\s*y\s*=\s*\d+/.test(l));
    if (rleStart >= 0) {
      const rleText = patternLines.slice(rleStart).join('\n');
      try { const parsed = parseRLE(rleText); cells = parsed.cells || []; } catch {}
    } else {
      const dotLines = patternLines.filter(l => /^[\t ].*[.*]/.test(l)).map(l => l.replace(/^\t/, ''));
      if (dotLines.length > 0) {
        cells = parseDotAsteriskPattern(dotLines);
      }
    }
    cells = normalizeCells(cells);
    const { width, height } = dims(cells);

    // Classify entry type and detect alias/cross-reference
    let aliasOf = null;
    let entryType = 'concept';
    const descStart = descJoined;
    let m;
    if ((m = descStart.match(/^=\s*\{([^}]+)\}/))) {
      aliasOf = m[1];
      entryType = 'alias';
    } else if ((m = descStart.match(/^See\s*\{([^}]+)\}/i))) {
      aliasOf = m[1];
      entryType = 'crossref';
    }
    if (cells.length > 0) entryType = 'pattern';

    out.push({
      name: current.name,
      metadata: current.metadata,
      description: descJoined,
      type: entryType,
      aliasOf: aliasOf || undefined,
      width, height,
      cells,
      cellCount: cells.length
    });
    current = null; buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(':')) {
      const def = parseDefinitionLine(line);
      if (def) {
        if (current) flush();
        current = def;
        buffer = [];
        continue;
      }
    }
    if (current) buffer.push(line);
  }
  if (current) flush();
  return out;
}

export async function parseLexiconFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return parseLexiconText(text);
}
