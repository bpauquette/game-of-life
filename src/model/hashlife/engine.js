// Simple Hashlife engine scaffold
// This file provides utilities to build a quadtree from a set of live cells,
// convert back to cell lists, and advance the world by N generations. The
// engine uses a combination of brute-force stepping for small regions and a
// memoized center-step algorithm for larger power-of-two squares.

import { makeLeaf, makeNode, clearMemo } from './node.js';

// Memoized power-of-two stepping for nodes: cache results keyed by node.key
import { resultMemo } from './node.js';
// Only use makeLeaf and makeNode where needed, do not leave unused

function addSetEntryFromKnownPoint(target, point) {
    if (typeof point === 'string') {
        target.add(point);
        return;
    }
    if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        target.add(`${point.x},${point.y}`);
        return;
    }
    if (Array.isArray(point) && point.length >= 2) {
        target.add(`${point[0]},${point[1]}`);
    }
}

function addFlatPairs(target, cells) {
    for (let i = 0; i < cells.length; i += 2) {
        target.add(`${cells[i]},${cells[i + 1]}`);
    }
}

function addObjectLikeEntries(target, cells) {
    for (const point of cells) {
        target.add(`${point.x},${point.y}`);
    }
}

function pointToKey(point) {
    if (!point) return null;
    return `${point.x},${point.y}`;
}

function keyToPoint(key) {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

// Helper: convert flat cell array or array of {x,y} into Set of "x,y" strings
function cellsToSet(cells) {
    const s = new Set();
    if (!cells) return s;
    // Accept Set inputs directly (common in internal code paths)
    if (cells instanceof Set) {
        for (const point of cells) addSetEntryFromKnownPoint(s, point);
        return s;
    }
    if (Array.isArray(cells) && cells.length && typeof cells[0] === 'number') {
        addFlatPairs(s, cells);
        return s;
    }
    addObjectLikeEntries(s, cells);
    return s;
}

// Compute bounding box for a set of live cells
function boundingBoxFromSet(set) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (set.size === 0) return null;
    for (const s of set) {
        const [x, y] = s.split(',').map(Number);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

// Grow bounding box to nearest power-of-two square and return level k
function computeLevelForBounds(bounds) {
    if (!bounds) return 0;
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const size = Math.max(width, height);
    let power = 1;
    let k = 0;
    while (power < size) { power <<= 1; k++; }
    return k; // level such that 2^k >= size
}

// Build a quadtree node that contains all live cells. Leaves are level 0 nodes.
// Build a quadtree node that contains all live cells. Leaves are level 0 nodes.
// Returns an object { node, originX, originY } where originX/Y correspond
// to the (minX,minY) used as the origin for the leaf coordinates.
function buildTreeFromCells(cells, minLevel = 0) {
    const s = cellsToSet(cells);
    const bounds = boundingBoxFromSet(s) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let k = computeLevelForBounds(bounds);
    if (minLevel && k < minLevel) k = minLevel;
    // origin at bounds.minX,minY
    const originX = bounds.minX;
    const originY = bounds.minY;

    function buildNode(level, ox, oy) {
        if (level === 0) {
            const key = `${ox},${oy}`;
            return makeLeaf(s.has(key));
        }
        const half = 1 << (level - 1);
        const nw = buildNode(level - 1, ox, oy);
        const ne = buildNode(level - 1, ox + half, oy);
        const sw = buildNode(level - 1, ox, oy + half);
        const se = buildNode(level - 1, ox + half, oy + half);
        return makeNode(nw, ne, sw, se);
    }

    return { node: buildNode(k, originX, originY), originX, originY };
}

// Convert node -> array of cell coords [{x,y}, ...]
function nodeToCells(node, ox = 0, oy = 0) {
    const out = [];
    function recurse(n, x, y) {
        if (!n) return;
        if (n.level === 0) {
            if (n.getPopulation && n.getPopulation() > 0) out.push({ x, y });
            return;
        }
        const half = 1 << (n.level - 1);
        recurse(n.nw, x, y);
        recurse(n.ne, x + half, y);
        recurse(n.sw, x, y + half);
        recurse(n.se, x + half, y + half);
    }
    recurse(node, ox, oy);
    return out;
}

function forEachNeighbor(x, y, callback) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            callback(x + dx, y + dy);
        }
    }
}

function incrementNeighbor(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
}

function shouldCellLive(alive, count) {
    if (alive) return count === 2 || count === 3;
    return count === 3;
}

// Brute-force life step for a set of live cells
function bruteStepSet(set) {
    const neighbors = new Map();
    for (const point of set) {
        const { x, y } = keyToPoint(point);
        forEachNeighbor(x, y, (nx, ny) => incrementNeighbor(neighbors, `${nx},${ny}`));
    }
    const out = new Set();
    for (const [cell, cnt] of neighbors.entries()) {
        const alive = set.has(cell);
        if (shouldCellLive(alive, cnt)) out.add(cell);
    }
    return out;
}

// Advance N generations using brute force on sets
function advanceBrute(cells, n, onProgress) {
    let s = cellsToSet(cells);
    const total = Math.max(0, Number(n) || 0);
    for (let i = 0; i < total; i++) {
        s = bruteStepSet(s);
        if (onProgress && (i + 1 === total || (i + 1) % 10 === 0)) {
            // Emit occasional progress snapshots to keep UI responsive
            onProgress({ generation: i + 1, cells: setToPointArray(s) });
        }
    }
    return s; // return Set<string> of "x,y"
}

function setToPointArray(set) {
    const out = [];
    for (const key of set) out.push(keyToPoint(key));
    return out;
}

function arrayPointsToSet(points) {
    return new Set(points.map(point => pointToKey(point)));
}

function normalizeInputCells(cells) {
    if (Array.isArray(cells)) return cells;
    return Array.from(cells).map(keyToPoint);
}

// Public API
function clearEngineCache() {
    clearMemo();
}

// Helper: extract subnode of given level starting at target origin
function extractSubnode(node, nodeOx, nodeOy, targetLevel, targetOx, targetOy) {
    // navigate the quadtree until we reach the desired level
    let n = node;
    let ox = nodeOx;
    let oy = nodeOy;
    while (n && n.level > targetLevel) {
        const half = 1 << (n.level - 1);
        const midx = ox + half;
        const midy = oy + half;
        // determine which quadrant contains targetOx,targetOy
        const left = targetOx < midx;
        const top = targetOy < midy;
        if (left && top) {
            // nw
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

// Memoized center-step: returns the node representing the center
// region after 2^(k-1) generations. Returned node has level k-1 and
// origin at (ox + 2^(k-2), oy + 2^(k-2)).
function result(nodeObj) {
    const node = nodeObj.node;
    const ox = nodeObj.originX;
    const oy = nodeObj.originY;
    const k = node.level;
    const cacheKey = `R:${node.key}`;
    if (resultMemo.has(cacheKey)) return resultMemo.get(cacheKey);

    // base case: small nodes - compute by brute force and extract center
    if (k <= 2) {
        // simulate node's full region for 2^(k-1) steps and extract center
        const cells = nodeToCells(node, ox, oy);
        const steps = 1 << (k - 1);
        const nextSet = advanceBrute(cellsToSet(cells), steps);
        const outArr = [];
        for (const c of nextSet) {
            const [x, y] = c.split(',').map(Number);
            outArr.push({ x, y });
        }
        // build a tree with at least level k so extraction works
        const resTree = buildTreeFromCells(outArr, k);
        const centerOx = ox + (1 << (k - 2));
        const centerOy = oy + (1 << (k - 2));
        const sub = extractSubnode(resTree.node, resTree.originX, resTree.originY, k - 1, centerOx, centerOy);
        resultMemo.set(cacheKey, sub);
        return sub;
    }

    // recursive case: build 3x3 of level k-1 subnodes (using grandchildren)
    const half = 1 << (k - 1);
    const q = 1 << (k - 2);
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

    // compose the 4 quadrants for the center result
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
    // nodeObj: { node, originX, originY }
    const node = nodeObj.node;
    const ox = nodeObj.originX || 0;
    const oy = nodeObj.originY || 0;
    const k = node.level;
    const fullKey = `F:${node.key}`;
    if (resultMemo.has(fullKey)) return resultMemo.get(fullKey);

    // For small nodes fall back to brute-force
    if (k <= 2) {
        const cells = nodeToCells(node, ox, oy);
        const steps = 1 << k;
        const nextSet = advanceBrute(cellsToSet(cells), steps);
        const out = [];
        for (const c of nextSet) {
            const [x, y] = c.split(',').map(Number);
            out.push({ x, y });
        }
        const resultTreeObj = buildTreeFromCells(out);
        resultMemo.set(fullKey, resultTreeObj);
        return resultTreeObj;
    }

    // Build the 3x3 subnodes at level k-1 (same as in result)
    const half = 1 << (k - 1);
    const q = 1 << (k - 2);
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

    // compute center results for each 3x3 block
    const r00 = result(n00);
    const r01 = result(n01);
    const r02 = result(n02);
    const r10 = result(n10);
    const r11 = result(n11);
    const r12 = result(n12);
    const r20 = result(n20);
    const r21 = result(n21);
    const r22 = result(n22);

    // assemble four level-(k) nodes from the rXX (each rXX.node is level k-1)
    const A = makeNode(r00.node, r01.node, r10.node, r11.node);
    const B = makeNode(r01.node, r02.node, r11.node, r12.node);
    const C = makeNode(r10.node, r11.node, r20.node, r21.node);
    const D = makeNode(r11.node, r12.node, r21.node, r22.node);

    const bigNode = makeNode(A, B, C, D); // level k+1
    const bigObj = { node: bigNode, originX: ox - q, originY: oy - q };
    // result on the big node gives the center after 2^(k) steps
    const final = result(bigObj);
    resultMemo.set(fullKey, final);
    return final;
}

function emitProgress(progressCb, generation, cells) {
    if (!progressCb) return;
    try { progressCb({ generation, cells }); } catch (e) { /* no-op */ }
}

function createBruteProgressReporter(progressCb, baseProgress) {
    if (!progressCb) return null;
    return (progress) => {
        if (!progress) return;
        const generation = typeof progress.generation === 'number' ? baseProgress + progress.generation : baseProgress;
        emitProgress(progressCb, generation, progress.cells || []);
    };
}

function attemptTreeStep(currentCells, remaining) {
    const treeObj = buildTreeFromCells(currentCells);
    const { node, originX, originY } = treeObj;
    const topStep = 1 << node.level;
    if (topStep > remaining) return null;

    const resObj = nodeStepPow2({ node, originX, originY });
    return {
        currentCells: nodeToCells(resObj.node, resObj.originX || 0, resObj.originY || 0),
        stepSize: topStep
    };
}

function runBruteFallback(currentCells, remaining, progressed, progressCb) {
    const nextSet = advanceBrute(
        arrayPointsToSet(currentCells),
        remaining,
        createBruteProgressReporter(progressCb, progressed)
    );
    return {
        currentCells: setToPointArray(nextSet),
        progressed: progressed + remaining
    };
}

// Advance N generations using a decomposition into powers-of-two and
// memoized node stepping where possible. Optionally accepts onProgress
// callback which may receive occasional snapshots { generation, cells }.
async function advance(cells, n, onProgress) {
    let currentCells = normalizeInputCells(cells);
    let remaining = n;
    let progressed = 0;
    const progressCb = typeof onProgress === 'function' ? onProgress : null;

    while (remaining > 0) {
        const treeStep = attemptTreeStep(currentCells, remaining);
        if (treeStep) {
            currentCells = treeStep.currentCells;
            progressed += treeStep.stepSize;
            remaining -= treeStep.stepSize;
            emitProgress(progressCb, progressed, currentCells);
            continue;
        }

        const bruteStep = runBruteFallback(currentCells, remaining, progressed, progressCb);
        currentCells = bruteStep.currentCells;
        progressed = bruteStep.progressed;
        remaining = 0;
    }
    const finalTreeObj = buildTreeFromCells(currentCells);
    return { tree: finalTreeObj.node, originX: finalTreeObj.originX, originY: finalTreeObj.originY, cells: currentCells, generations: progressed };
}

export { buildTreeFromCells, nodeToCells, advance, clearEngineCache };

