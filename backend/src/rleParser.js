// Basic RLE parser for Conway Life patterns
// Exports parseRLE(text) -> { name, width, height, cells: [{x,y}], rule, meta }

const HEADER_RE = /x\s*=\s*(\-?\d+)\s*,\s*y\s*=\s*(\-?\d+)(?:\s*,\s*rule\s*=\s*([^\s,]+))?/i;

function parseHeader(lines){
  const meta = {comments:[]};
  let headerLine = null;
  for(const line of lines){
    const t = line.trim();
    if(t.startsWith('#')){
      const body = t.slice(1).trim();
      const key = body[0];
      if(key === 'N') meta.name = body.slice(1).trim();
      else if(key === 'C' || key === 'c') meta.comments.push(body.slice(1).trim());
      else if(key === 'R' || key === 'P') meta.position = body.slice(1).trim();
      else if(body.toLowerCase().startsWith('rule')) meta.ruleLine = body;
    } else if(HEADER_RE.test(t) && !headerLine){
      headerLine = t;
      const m = HEADER_RE.exec(t);
      meta.width = parseInt(m[1],10);
      meta.height = parseInt(m[2],10);
      if(m[3]) meta.rule = m[3];
    }
  }
  return {meta, headerLine};
}

function tokenizeRLE(body){
  // remove whitespace other than letters/numbers/$/! and concatenate
  const text = body.replace(/\s+/g,'');
  const tokens = [];
  const re = /(\d*)([ob$!])/gi;
  let m;
  while((m = re.exec(text)) !== null){
    const count = m[1] ? parseInt(m[1],10) : 1;
    const tag = m[2];
    tokens.push({count,tag});
    if(tag === '!') break;
  }
  return tokens;
}

function parseRLE(text){
  if(!text || !text.trim()) throw new Error('Empty RLE text');
  const lines = text.split(/\r?\n/);
  const {meta, headerLine} = parseHeader(lines);

  const body = getBodyText(lines, headerLine);
  const tokens = tokenizeRLE(body);
  const cells = expandTokensToCells(tokens);

  // compute bounding box and early-return if empty
  const bbox = computeBoundingBox(cells);
  if (bbox.empty) {
    return {
      name: meta.name || 'unnamed',
      width: meta.width || 0,
      height: meta.height || 0,
      cells: [],
      rule: meta.rule || null,
      meta
    };
  }

  // normalize so minX/minY -> 0
  const normalized = cells.map(p => ({x: p.x - bbox.minX, y: p.y - bbox.minY}));
  const width = (bbox.maxX - bbox.minX) + 1;
  const height = (bbox.maxY - bbox.minY) + 1;

  return {
    name: meta.name || 'unnamed',
    width,
    height,
    cells: normalized,
    rule: meta.rule || null,
    meta: { ...meta, originalHeader: headerLine }
  };
}

// Helper: extract body text from lines
function getBodyText(lines, headerLine) {
  const bodyLines = [];
  let inBody = false;
  for (const line of lines) {
    const t = line.trim();
    if (!inBody && HEADER_RE.test(t)) {
      inBody = true;
      continue;
    }
    if (!t.startsWith('#') && (inBody || !HEADER_RE.test(t))) {
      if (t.length > 0) bodyLines.push(t);
    }
  }
  if (!headerLine) {
    const alt = lines.filter(l => !l.trim().startsWith('#')).map(l => l.trim()).filter(Boolean);
    bodyLines.length = 0;
    bodyLines.push(...alt);
  }
  return bodyLines.join('');
}

// Helper: expand RLE tokens into cell coordinates
function expandTokensToCells(tokens) {
  let cx = 0, cy = 0;
  const cells = [];
  for (const tk of tokens) {
    const c = tk.count;
    const tag = tk.tag.toLowerCase();
    if (tag === 'o') {
      for (let i = 0; i < c; i++) {
        cells.push({ x: cx + i, y: cy });
      }
      cx += c;
    } else if (tag === 'b') {
      cx += c;
    } else if (tag === '$') {
      cy += c;
      cx = 0;
    } else if (tag === '!') {
      break;
    }
  }
  return cells;
}

// Helper: compute bounding box for a list of points
function computeBoundingBox(cells) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of cells) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (minX === Infinity) return { empty: true };
  return { empty: false, minX, minY, maxX, maxY };
}

module.exports = { parseRLE };
