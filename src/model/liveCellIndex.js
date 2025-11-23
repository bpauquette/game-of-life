// Efficient storage for live Game of Life cells without relying on string keys.
// Keeps columns grouped by X coordinate, each column storing a Set of Y values.

const KEY_SEPARATOR = ',';

function coerceCoords(input, maybeY) {
  if (typeof input === 'number' && typeof maybeY === 'number') {
    return { x: input, y: maybeY };
  }
  if (typeof input === 'string' && maybeY === undefined) {
    const parts = input.split(KEY_SEPARATOR);
    if (parts.length === 2) {
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }
    return null;
  }
  if (Array.isArray(input)) {
    const x = Number(input[0]);
    const y = Number(input[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
    return null;
  }
  if (input && typeof input === 'object') {
    const x = Number(input.x);
    const y = Number(input.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  return null;
}

export default class LiveCellIndex {
  constructor() {
    this.columns = new Map();
    this._size = 0;
    this._bounds = null;
    this._boundsDirty = true;
  }

  static fromCells(cells) {
    const index = new LiveCellIndex();
    if (!Array.isArray(cells)) {
      return index;
    }
    for (const cell of cells) {
      const coords = coerceCoords(cell);
      if (!coords) continue;
      index.setCellAlive(coords.x, coords.y, true);
    }
    return index;
  }

  get size() {
    return this._size;
  }

  clear() {
    this.columns.clear();
    this._size = 0;
    this._bounds = null;
    this._boundsDirty = true;
  }

  clone() {
    const copy = new LiveCellIndex();
    for (const [x, column] of this.columns.entries()) {
      const newColumn = new Set(column);
      copy.columns.set(x, newColumn);
      copy._size += newColumn.size;
    }
    copy._bounds = this._bounds ? { ...this._bounds } : null;
    copy._boundsDirty = this._boundsDirty;
    return copy;
  }

  _getColumn(x, createIfMissing) {
    let column = this.columns.get(x);
    if (!column && createIfMissing) {
      column = new Set();
      this.columns.set(x, column);
    }
    return column;
  }

  _add(x, y) {
    const column = this._getColumn(x, true);
    if (!column.has(y)) {
      column.add(y);
      this._size++;
      this._boundsDirty = true;
      return true;
    }
    return false;
  }

  _remove(x, y) {
    const column = this.columns.get(x);
    if (!column || !column.delete(y)) {
      return false;
    }
    if (column.size === 0) {
      this.columns.delete(x);
    }
    this._size--;
    this._boundsDirty = true;
    return true;
  }

  setCellAlive(x, y, alive = true) {
    if (alive) {
      return this._add(x, y);
    }
    return this._remove(x, y);
  }

  has(key, maybeY) {
    const coords = coerceCoords(key, maybeY);
    if (!coords) {
      return false;
    }
    return this.isCellAlive(coords.x, coords.y);
  }

  isCellAlive(x, y) {
    const column = this.columns.get(x);
    return column ? column.has(y) : false;
  }

  set(key, value = true) {
    const coords = coerceCoords(key);
    if (!coords) {
      return this;
    }
    this.setCellAlive(coords.x, coords.y, !!value);
    return this;
  }

  delete(key, maybeY) {
    const coords = coerceCoords(key, maybeY);
    if (!coords) {
      return false;
    }
    return this._remove(coords.x, coords.y);
  }

  forEachCell(callback) {
    for (const [x, column] of this.columns.entries()) {
      for (const y of column.values()) {
        callback(x, y);
      }
    }
  }

  entries() {
    const iterator = this._iterateEntries();
    return iterator;
  }

  *_iterateEntries() {
    for (const [x, column] of this.columns.entries()) {
      for (const y of column.values()) {
        yield [`${x}${KEY_SEPARATOR}${y}`, true];
      }
    }
  }

  keys() {
    return this._iterateKeys();
  }

  *_iterateKeys() {
    for (const [key] of this._iterateEntries()) {
      yield key;
    }
  }

  values() {
    return this._iterateValues();
  }

  *_iterateValues() {
    // eslint-disable-next-line no-unused-vars
    for (const _ of this._iterateEntries()) {
      yield true;
    }
  }

  [Symbol.iterator]() {
    return this._iterateEntries();
  }

  forEach(callback, thisArg) {
    for (const [key, value] of this._iterateEntries()) {
      callback.call(thisArg, value, key, this);
    }
  }

  toArray() {
    const cells = [];
    this.forEachCell((x, y) => {
      cells.push({ x, y });
    });
    return cells;
  }

  getBounds() {
    if (this._size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    if (!this._boundsDirty && this._bounds) {
      return { ...this._bounds };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    this.forEachCell((x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    this._bounds = { minX, maxX, minY, maxY };
    this._boundsDirty = false;
    return { ...this._bounds };
  }
}
