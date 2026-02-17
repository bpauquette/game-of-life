// shapeWorker.js
// Offloads shape normalization and key generation for recent shapes

self.onmessage = function(e) {
  const { type, shape } = e.data;
  if (type === 'normalize') {
    const result = normalizeRecentShape(shape);
    self.postMessage({ type: 'normalized', shapeId: shape.id, result });
  } else if (type === 'key') {
    const key = generateShapeKey(shape);
    self.postMessage({ type: 'key', shapeId: shape.id, key });
  }
};

function extractCells(shape) {
  if (!shape) return [];
  if (Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape.pattern)) return shape.pattern;
  if (Array.isArray(shape.liveCells)) return shape.liveCells;
  return [];
}

function toCellPoint(cell) {
  if (Array.isArray(cell)) {
    return { x: cell[0] ?? 0, y: cell[1] ?? 0 };
  }
  return { x: cell?.x ?? 0, y: cell?.y ?? 0 };
}

function buildAbsoluteCells(sourceCells) {
  let minX = Infinity;
  let minY = Infinity;
  const absoluteCells = sourceCells.map((cell) => {
    const { x, y } = toCellPoint(cell);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    return { x, y };
  });
  return {
    absoluteCells,
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0
  };
}

function normalizeCells(absoluteCells, minX, minY) {
  return absoluteCells.map(({ x, y }) => [x - minX, y - minY]);
}

function computeBoundsFromNormalized(normalized) {
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1
  };
}

function buildNormalizedShape(shape, normalized, width, height, sourceCellCount) {
  return {
    ...shape,
    cells: normalized,
    width: width || shape.width,
    height: height || shape.height,
    meta: {
      ...shape.meta,
      width: width || shape.meta?.width,
      height: height || shape.meta?.height,
      cellCount: sourceCellCount
    }
  };
}

function normalizeRecentShape(shape) {
  if (!shape) return shape;
  const sourceCells = extractCells(shape);
  if (!sourceCells.length) return shape;
  const { absoluteCells, minX, minY } = buildAbsoluteCells(sourceCells);
  const normalized = normalizeCells(absoluteCells, minX, minY);
  if (!normalized.length) return shape;
  const { width, height } = computeBoundsFromNormalized(normalized);
  return buildNormalizedShape(shape, normalized, width, height, sourceCells.length);
}

function appendNamePart(keyParts, shape) {
  if (shape?.name) keyParts.push(`n:${String(shape.name)}`);
}

function appendMetaParts(keyParts, shape) {
  if (!shape?.meta) return;
  const { width, height, cellCount } = shape.meta;
  if (!width && !height && !cellCount) return;
  if (width) keyParts.push(`w:${width}`);
  if (height) keyParts.push(`h:${height}`);
  if (cellCount) keyParts.push(`c:${cellCount}`);
}

function appendCellSampleParts(keyParts, shape) {
  const cells = extractCells(shape);
  if (!Array.isArray(cells) || cells.length === 0) return;
  keyParts.push(`len:${cells.length}`);
  const sampleCount = Math.min(4, cells.length);
  for (let i = 0; i < sampleCount; i += 1) {
    const { x, y } = toCellPoint(cells[i]);
    keyParts.push(`${x},${y}`);
  }
}

function generateShapeKey(shape) {
  if (shape?.id) return String(shape.id);
  if (typeof shape === 'string') return shape;
  const keyParts = [];
  appendNamePart(keyParts, shape);
  appendMetaParts(keyParts, shape);
  appendCellSampleParts(keyParts, shape);
  return keyParts.join('|');
}
