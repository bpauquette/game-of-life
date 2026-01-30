const engine = require('../engine.js');

// Gosper glider gun pattern (relative coordinates)
const GOSPER = [
  [0,4],[0,5],[1,4],[1,5],
  [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
  [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],[24,0],[24,1],[24,5],[24,6],
  [34,2],[34,3],[35,2],[35,3]
];

function normalize(cells) {
  const s = new Set();
  for (const c of cells) {
    if (Array.isArray(c)) s.add(`${c[0]},${c[1]}`);
    else if (c && typeof c.x === 'number' && typeof c.y === 'number') s.add(`${c.x},${c.y}`);
    else if (typeof c === 'string') s.add(c);
  }
  return s;
}

test('Gosper glider gun: deterministic stepping (compose steps)', async () => {
  const initial = GOSPER.map(([x,y]) => ({ x, y }));
  // Advance by 10 then 5
  const res10 = await engine.advance(initial, 10);
  const res10then5 = await engine.advance(res10.cells, 5);

  // Advance by 15 in one go
  const res15 = await engine.advance(initial, 15);

  const s1 = normalize(res10then5.cells);
  const s2 = normalize(res15.cells);

  expect(s1.size).toBe(s2.size);
  // Ensure sets are identical
  for (const cell of s1) {
    expect(s2.has(cell)).toBe(true);
  }
});

const gameLogic = require('../../gameLogic.js');

test('Gosper glider gun: compare `gameLogic.ticks` reference to engine (15 gens)', async () => {
  const initial = GOSPER.map(([x,y]) => ({ x, y }));
  const ref = gameLogic.ticks(initial, 15);
  // `ticks` returns a LiveCellIndex; normalize to set of strings
  const refCells = [];
  if (ref && typeof ref.forEachCell === 'function') {
    ref.forEachCell((x, y) => refCells.push({ x, y }));
  } else if (ref && typeof ref.keys === 'function') {
    for (const k of ref.keys()) {
      const [x, y] = String(k).split(',').map(Number);
      refCells.push({ x, y });
    }
  }

  const res = await engine.advance(initial, 15);
  const sRef = normalize(refCells);
  const sEngine = normalize(res.cells);
  expect(sEngine.size).toBe(sRef.size);
  for (const c of sRef) expect(sEngine.has(c)).toBe(true);
});
