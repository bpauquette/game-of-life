// shapeWorker.js
// Offloads shape normalization and key generation for recent shapes

globalThis.onmessage = function(e) {
  const { type, shape } = e.data;
  if (type === 'normalize') {
    const result = normalizeRecentShape(shape);
    globalThis.postMessage({ type: 'normalized', shapeId: shape.id, result });
  } else if (type === 'key') {
    const key = generateShapeKey(shape);
    globalThis.postMessage({ type: 'key', shapeId: shape.id, key });
  }
};

function extractCells(shape) {
  if (!shape) return [];
  if (Array.isArray(shape.cells)) return shape.cells;
  if (Array.isArray(shape.pattern)) return shape.pattern;
  if (Array.isArray(shape.liveCells)) return shape.liveCells;
  return [];
}

function normalizeRecentShape(shape) {
  if (!shape) return shape;
  const sourceCells = extractCells(shape);
  if (!sourceCells.length) return shape;
  let minX = Infinity;
  let minY = Infinity;
  const absoluteCells = sourceCells.map((cell) => {
    const x = Array.isArray(cell) ? cell[0] : (cell?.x ?? 0);
    const y = Array.isArray(cell) ? cell[1] : (cell?.y ?? 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    return { x, y };
  });
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;
  const normalized = absoluteCells.map(({ x, y }) => [x - minX, y - minY]);
  if (!normalized.length) return shape;
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  return {
    ...shape,
    cells: normalized,
    width: width || shape.width,
    height: height || shape.height,
    meta: {
      ...shape.meta,
      width: width || shape.meta?.width,
      height: height || shape.meta?.height,
      cellCount: sourceCells.length
    }
  };
}

function generateShapeKey(shape) {
  if (shape?.id) return String(shape.id);
  if (typeof shape === 'string') return shape;
  let keyParts = [];
  if (shape?.name) keyParts.push(`n:${String(shape.name)}`);
  if (shape?.meta && (shape.meta.width || shape.meta.height || shape.meta.cellCount)) {
    if (shape.meta.width) keyParts.push(`w:${shape.meta.width}`);
    if (shape.meta.height) keyParts.push(`h:${shape.meta.height}`);
    if (shape.meta.cellCount) keyParts.push(`c:${shape.meta.cellCount}`);
  }
  const cells = extractCells(shape);
  if (Array.isArray(cells) && cells.length > 0) {
    keyParts.push(`len:${cells.length}`);
    const sampleCount = Math.min(4, cells.length);
    for (let i = 0; i < sampleCount; i++) {
      const c = cells[i];
      const x = Array.isArray(c) ? c[0] : (c?.x ?? 0);
      const y = Array.isArray(c) ? c[1] : (c?.y ?? 0);
      keyParts.push(`${x},${y}`);
    }
  }
  return keyParts.join('|');
}