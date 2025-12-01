var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/model/hashlife/node.js
var require_node = __commonJS({
  "src/model/hashlife/node.js"(exports, module) {
    var nextNodeId = 1;
    var HLNode = class _HLNode {
      constructor(level, nw, ne, sw, se) {
        this.id = nextNodeId++;
        this.level = level;
        this.nw = nw || null;
        this.ne = ne || null;
        this.sw = sw || null;
        this.se = se || null;
        this.population = null;
        this.key = _HLNode.makeKey(level, nw, ne, sw, se);
      }
      static makeKey(level, nw, ne, sw, se) {
        if (level === 0) return `L0:${nw ? "1" : "0"}`;
        const a = nw ? nw.id : 0;
        const b = ne ? ne.id : 0;
        const c = sw ? sw.id : 0;
        const d = se ? se.id : 0;
        return `L${level}:${a},${b},${c},${d}`;
      }
      getPopulation() {
        if (this.population !== null) return this.population;
        if (this.level === 0) {
          this.population = this.nw ? 1 : 0;
        } else {
          this.population = (this.nw ? this.nw.getPopulation() : 0) + (this.ne ? this.ne.getPopulation() : 0) + (this.sw ? this.sw.getPopulation() : 0) + (this.se ? this.se.getPopulation() : 0);
        }
        return this.population;
      }
    };
    var nodeMemo = /* @__PURE__ */ new Map();
    var resultMemo = /* @__PURE__ */ new Map();
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
      const child = makeEmpty(level - 1);
      return makeNode(child, child, child, child);
    }
    function makeNode(nw, ne, sw, se) {
      const level = nw && nw.level !== void 0 ? nw.level + 1 : 1;
      const key = HLNode.makeKey(level, nw, ne, sw, se);
      if (nodeMemo.has(key)) return nodeMemo.get(key);
      const node = new HLNode(level, nw, ne, sw, se);
      nodeMemo.set(key, node);
      return node;
    }
    module.exports = {
      HLNode,
      makeLeaf,
      makeNode,
      makeEmpty,
      nodeMemo,
      resultMemo,
      clearMemo
    };
  }
});

// src/model/hashlife/engine.js
var require_engine = __commonJS({
  "src/model/hashlife/engine.js"(exports, module) {
    var { makeLeaf, makeNode, clearMemo } = require_node();
    function cellsToSet(cells) {
      const s = /* @__PURE__ */ new Set();
      if (!cells) return s;
      if (cells instanceof Set) {
        for (const p of cells) {
          if (typeof p === "string") s.add(p);
          else if (p && typeof p.x === "number" && typeof p.y === "number") s.add(`${p.x},${p.y}`);
          else if (Array.isArray(p) && p.length >= 2) s.add(`${p[0]},${p[1]}`);
        }
        return s;
      }
      if (Array.isArray(cells) && cells.length && typeof cells[0] === "number") {
        for (let i = 0; i < cells.length; i += 2) s.add(`${cells[i]},${cells[i + 1]}`);
        return s;
      }
      for (const p of cells) s.add(`${p.x},${p.y}`);
      return s;
    }
    function boundingBoxFromSet(set) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      if (set.size === 0) return null;
      for (const s of set) {
        const [x, y] = s.split(",").map(Number);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      return { minX, minY, maxX, maxY };
    }
    function computeLevelForBounds(bounds) {
      if (!bounds) return 0;
      const width = bounds.maxX - bounds.minX + 1;
      const height = bounds.maxY - bounds.minY + 1;
      const size = Math.max(width, height);
      let power = 1;
      let k = 0;
      while (power < size) {
        power <<= 1;
        k++;
      }
      return k;
    }
    function buildTreeFromCells(cells, minLevel = 0) {
      const s = cellsToSet(cells);
      const bounds = boundingBoxFromSet(s) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let k = computeLevelForBounds(bounds);
      if (minLevel && k < minLevel) k = minLevel;
      const originX = bounds.minX;
      const originY = bounds.minY;
      function buildNode(level, ox, oy) {
        if (level === 0) {
          const key = `${ox},${oy}`;
          return makeLeaf(s.has(key));
        }
        const half = 1 << level - 1;
        const nw = buildNode(level - 1, ox, oy);
        const ne = buildNode(level - 1, ox + half, oy);
        const sw = buildNode(level - 1, ox, oy + half);
        const se = buildNode(level - 1, ox + half, oy + half);
        return makeNode(nw, ne, sw, se);
      }
      return { node: buildNode(k, originX, originY), originX, originY };
    }
    function nodeToCells(node, ox = 0, oy = 0) {
      const out = [];
      function recurse(n, x, y) {
        if (!n) return;
        if (n.level === 0) {
          if (n.getPopulation && n.getPopulation() > 0) out.push({ x, y });
          return;
        }
        const half = 1 << n.level - 1;
        recurse(n.nw, x, y);
        recurse(n.ne, x + half, y);
        recurse(n.sw, x, y + half);
        recurse(n.se, x + half, y + half);
      }
      recurse(node, ox, oy);
      return out;
    }
    function bruteStepSet(set) {
      const neighbors = /* @__PURE__ */ new Map();
      for (const s of set) {
        const [x, y] = s.split(",").map(Number);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const key = `${x + dx},${y + dy}`;
          neighbors.set(key, (neighbors.get(key) || 0) + 1);
        }
      }
      const out = /* @__PURE__ */ new Set();
      for (const [cell, cnt] of neighbors.entries()) {
        const alive = set.has(cell);
        if (alive && (cnt === 2 || cnt === 3)) out.add(cell);
        if (!alive && cnt === 3) out.add(cell);
      }
      return out;
    }
    function advanceBrute(cells, n) {
      let s = cellsToSet(cells);
      for (let i = 0; i < n; i++) s = bruteStepSet(s);
      return s;
    }
    function clearEngineCache() {
      clearMemo();
    }
    var { resultMemo } = require_node();
    function extractSubnode(node, nodeOx, nodeOy, targetLevel, targetOx, targetOy) {
      let n = node;
      let ox = nodeOx;
      let oy = nodeOy;
      while (n && n.level > targetLevel) {
        const half = 1 << n.level - 1;
        const midx = ox + half;
        const midy = oy + half;
        const left = targetOx < midx;
        const top = targetOy < midy;
        if (left && top) {
          n = n.nw;
        } else if (!left && top) {
          n = n.ne;
          ox = midx;
        } else if (left && !top) {
          n = n.sw;
          oy = midy;
        } else {
          n = n.se;
          ox = midx;
          oy = midy;
        }
      }
      return { node: n, originX: ox, originY: oy };
    }
    function result(nodeObj) {
      const node = nodeObj.node;
      const ox = nodeObj.originX;
      const oy = nodeObj.originY;
      const k = node.level;
      const cacheKey = `R:${node.key}`;
      if (resultMemo.has(cacheKey)) return resultMemo.get(cacheKey);
      if (k <= 2) {
        const cells = nodeToCells(node, ox, oy);
        const steps = 1 << k - 1;
        const nextSet = advanceBrute(cellsToSet(cells), steps);
        const outArr = [];
        for (const c2 of nextSet) {
          const [x, y] = c2.split(",").map(Number);
          outArr.push({ x, y });
        }
        const resTree = buildTreeFromCells(outArr, k);
        const centerOx2 = ox + (1 << k - 2);
        const centerOy2 = oy + (1 << k - 2);
        const sub = extractSubnode(resTree.node, resTree.originX, resTree.originY, k - 1, centerOx2, centerOy2);
        resultMemo.set(cacheKey, sub);
        return sub;
      }
      const half = 1 << k - 1;
      const q = 1 << k - 2;
      const a = node.nw, b = node.ne, c = node.sw, d = node.se;
      const n00 = { node: a, originX: ox, originY: oy };
      const n01 = { node: makeNode(a.ne, b.nw, a.se, b.sw), originX: ox + q, originY: oy };
      const n02 = { node: b, originX: ox + half, originY: oy };
      const n10 = { node: makeNode(a.sw, a.se, c.nw, c.ne), originX: ox, originY: oy + q };
      const n11 = { node: makeNode(a.se, b.sw, c.ne, d.nw), originX: ox + q, originY: oy + q };
      const n12 = { node: makeNode(b.sw, b.se, d.nw, d.ne), originX: ox + half, originY: oy + q };
      const n20 = { node: c, originX: ox, originY: oy + half };
      const n21 = { node: makeNode(c.ne, d.nw, c.se, d.sw), originX: ox + q, originY: oy + half };
      const n22 = { node: d, originX: ox + half, originY: oy + half };
      const r00 = result(n00);
      const r01 = result(n01);
      const r02 = result(n02);
      const r10 = result(n10);
      const r11 = result(n11);
      const r12 = result(n12);
      const r20 = result(n20);
      const r21 = result(n21);
      const r22 = result(n22);
      const nw = makeNode(r00.node.se, r01.node.sw, r10.node.ne, r11.node.nw);
      const ne = makeNode(r01.node.se, r02.node.sw, r11.node.ne, r12.node.nw);
      const sw = makeNode(r10.node.se, r11.node.sw, r20.node.ne, r21.node.nw);
      const se = makeNode(r11.node.se, r12.node.sw, r21.node.ne, r22.node.nw);
      const center = makeNode(nw, ne, sw, se);
      const centerOx = ox + q;
      const centerOy = oy + q;
      const resultObj = { node: center, originX: centerOx, originY: centerOy };
      resultMemo.set(cacheKey, resultObj);
      return resultObj;
    }
    function nodeStepPow2(nodeObj) {
      const node = nodeObj.node;
      const ox = nodeObj.originX || 0;
      const oy = nodeObj.originY || 0;
      const k = node.level;
      const fullKey = `F:${node.key}`;
      if (resultMemo.has(fullKey)) return resultMemo.get(fullKey);
      if (k <= 2) {
        const cells = nodeToCells(node, ox, oy);
        const steps = 1 << k;
        const nextSet = advanceBrute(cellsToSet(cells), steps);
        const out = [];
        for (const c2 of nextSet) {
          const [x, y] = c2.split(",").map(Number);
          out.push({ x, y });
        }
        const resultTreeObj = buildTreeFromCells(out);
        resultMemo.set(fullKey, resultTreeObj);
        return resultTreeObj;
      }
      const half = 1 << k - 1;
      const q = 1 << k - 2;
      const a = node.nw, b = node.ne, c = node.sw, d = node.se;
      const n00 = { node: a, originX: ox, originY: oy };
      const n01 = { node: makeNode(a.ne, b.nw, a.se, b.sw), originX: ox + q, originY: oy };
      const n02 = { node: b, originX: ox + half, originY: oy };
      const n10 = { node: makeNode(a.sw, a.se, c.nw, c.ne), originX: ox, originY: oy + q };
      const n11 = { node: makeNode(a.se, b.sw, c.ne, d.nw), originX: ox + q, originY: oy + q };
      const n12 = { node: makeNode(b.sw, b.se, d.nw, d.ne), originX: ox + half, originY: oy + q };
      const n20 = { node: c, originX: ox, originY: oy + half };
      const n21 = { node: makeNode(c.ne, d.nw, c.se, d.sw), originX: ox + q, originY: oy + half };
      const n22 = { node: d, originX: ox + half, originY: oy + half };
      const r00 = result(n00);
      const r01 = result(n01);
      const r02 = result(n02);
      const r10 = result(n10);
      const r11 = result(n11);
      const r12 = result(n12);
      const r20 = result(n20);
      const r21 = result(n21);
      const r22 = result(n22);
      const A = makeNode(r00.node, r01.node, r10.node, r11.node);
      const B = makeNode(r01.node, r02.node, r11.node, r12.node);
      const C = makeNode(r10.node, r11.node, r20.node, r21.node);
      const D = makeNode(r11.node, r12.node, r21.node, r22.node);
      const bigNode = makeNode(A, B, C, D);
      const bigObj = { node: bigNode, originX: ox - q, originY: oy - q };
      const final = result(bigObj);
      resultMemo.set(fullKey, final);
      return final;
    }
    async function advance(cells, n) {
      let currentCells = Array.isArray(cells) ? cells : Array.from(cells).map((s) => {
        const [x, y] = s.split(",").map(Number);
        return { x, y };
      });
      let remaining = n;
      while (remaining > 0) {
        const treeObj = buildTreeFromCells(currentCells);
        const { node, originX, originY } = treeObj;
        const topStep = 1 << node.level;
        if (topStep <= remaining) {
          const resObj = nodeStepPow2({ node, originX, originY });
          currentCells = nodeToCells(resObj.node, resObj.originX || 0, resObj.originY || 0);
          remaining -= topStep;
        } else {
          const nextSet = advanceBrute(new Set(currentCells.map((p) => `${p.x},${p.y}`)), remaining);
          const nextArr = [];
          for (const c of nextSet) {
            const [x, y] = c.split(",").map(Number);
            nextArr.push({ x, y });
          }
          currentCells = nextArr;
          remaining = 0;
        }
      }
      const finalTreeObj = buildTreeFromCells(currentCells);
      return { tree: finalTreeObj.node, originX: finalTreeObj.originX, originY: finalTreeObj.originY, cells: currentCells };
    }
    module.exports = {
      buildTreeFromCells,
      nodeToCells,
      advance,
      clearEngineCache
    };
  }
});

// src/model/hashlife/worker.esm.js
var import_engine = __toESM(require_engine());
var engine = import_engine.default && import_engine.default.default ? import_engine.default.default : import_engine.default;
var running = false;
async function handleRun(id, payload) {
  try {
    const { cells, generations } = payload;
    const res = await engine.advance(cells, generations);
    postMessage({ id, type: "result", payload: res });
  } catch (err) {
    postMessage({ id, type: "error", payload: { message: err && err.message ? err.message : String(err) } });
  }
}
self.onmessage = function(ev) {
  const msg = ev.data;
  const { id, type, payload } = msg;
  if (type === "run") {
    if (running) {
      postMessage({ id, type: "error", payload: { message: "already running" } });
      return;
    }
    running = true;
    handleRun(id, payload).finally(() => {
      running = false;
    });
  } else if (type === "cancel") {
    postMessage({ id: null, type: "cancelled" });
  } else if (type === "clear") {
    engine.clearEngineCache();
    postMessage({ id: null, type: "cleared" });
  }
};
