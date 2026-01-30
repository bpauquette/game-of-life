const engine = require('../engine.js');
const worker = require('../worker.js');
const { resultMemo } = require('../node.js');

describe('hashlife worker wrapper', () => {
  beforeEach(() => engine.clearEngineCache());

  test('worker.run returns same result as engine.advance', async () => {
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: -1 }, { x: 1, y: -2 }];
    const r1 = await engine.advance(cells, 4);
    const r2 = await worker.run(cells, 4);
    const s1 = new Set(r1.cells.map(p => `${p.x},${p.y}`));
    const s2 = new Set(r2.cells.map(p => `${p.x},${p.y}`));
    expect(s1.size).toBe(s2.size);
    for (const p of s1) expect(s2.has(p)).toBe(true);
  });

  test('beehive is stable via worker', async () => {
    // beehive still life coords
    const cells = [{x:0,y:0},{x:1,y:0},{x:2,y:1},{x:1,y:2},{x:0,y:2},{x:-1,y:1}];
    const res = await worker.run(cells, 10);
    const set = new Set(res.cells.map(p => `${p.x},${p.y}`));
    for (const c of cells) expect(set.has(`${c.x},${c.y}`)).toBe(true);
  });

  test('clearCache empties resultMemo', async () => {
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    // run something to populate memo
    await worker.run(cells, 8);
    expect(resultMemo.size).toBeGreaterThan(0);
    worker.clearCache();
    expect(resultMemo.size).toBe(0);
  });
});
