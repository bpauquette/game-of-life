// Lightweight Hashlife node factory and memoization helpers
// This implementation provides canonical node objects and memo tables
// as a foundation for a full Hashlife engine. The center-step algorithm
// is not optimized here; the engine falls back to a safe brute-force
// advance for correctness until a full memoized center-step is implemented.

let nextNodeId = 1;

class HLNode {
  constructor(level, nw, ne, sw, se) {
    this.id = nextNodeId++;
    this.level = level; // power k => size = 2^k
    this.nw = nw || null;
    this.ne = ne || null;
    this.sw = sw || null;
    this.se = se || null;
    this.population = null; // computed lazily
    // precompute a key for memoization
    this.key = HLNode.makeKey(level, nw, ne, sw, se);
  }

  static makeKey(level, nw, ne, sw, se) {
    if (level === 0) return `L0:${nw ? '1' : '0'}`;
    const a = nw ? nw.id : 0;
    const b = ne ? ne.id : 0;
    const c = sw ? sw.id : 0;
    const d = se ? se.id : 0;
    return `L${level}:${a},${b},${c},${d}`;
  }

  getPopulation() {
    if (this.population !== null) return this.population;
    if (this.level === 0) {
      // leaf stores boolean in `nw` truthiness
      this.population = this.nw ? 1 : 0;
    } else {
      this.population = (this.nw ? this.nw.getPopulation() : 0)
                      + (this.ne ? this.ne.getPopulation() : 0)
                      + (this.sw ? this.sw.getPopulation() : 0)
                      + (this.se ? this.se.getPopulation() : 0);
    }
    return this.population;
  }
}

// Memo tables
const nodeMemo = new Map(); // key -> HLNode
const resultMemo = new Map(); // node.id -> result node for 2^k gens (future)

function clearMemo() {
  nodeMemo.clear();
  resultMemo.clear();
  nextNodeId = 1;
}

function makeLeaf(alive) {
  const key = HLNode.makeKey(0, alive ? { id: 1 } : null);
  if (nodeMemo.has(key)) return nodeMemo.get(key);
  const pseudo = alive ? { id: 1 } : null;
  const node = new HLNode(0, pseudo, null, null, null);
  node.population = alive ? 1 : 0;
  nodeMemo.set(key, node);
  return node;
}

function makeEmpty(level) {
  if (level === 0) return makeLeaf(false);
  // recursively build empty children
  const child = makeEmpty(level - 1);
  return makeNode(child, child, child, child);
}

function makeNode(nw, ne, sw, se) {
  const level = (nw && nw.level !== undefined) ? nw.level + 1 : 1;
  const key = HLNode.makeKey(level, nw, ne, sw, se);
  if (nodeMemo.has(key)) return nodeMemo.get(key);
  const node = new HLNode(level, nw, ne, sw, se);
  nodeMemo.set(key, node);
  return node;
}

export { HLNode, makeLeaf, makeNode, makeEmpty, nodeMemo, resultMemo, clearMemo };
