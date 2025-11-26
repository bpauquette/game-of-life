const { buildTreeFromCells, nodeToCells, advance, clearEngineCache } = require('../engine');

describe('hashlife engine scaffold', () => {
  beforeEach(() => clearEngineCache());

  test('block remains stable after 1 step', async () => {
    // 2x2 block at (0,0)-(1,1)
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    const res = await advance(cells, 1);
    const out = res.cells;
    expect(out.length).toBe(4);
    const set = new Set(out.map(p => `${p.x},${p.y}`));
    expect(set.has('0,0')).toBe(true);
    expect(set.has('1,0')).toBe(true);
    expect(set.has('0,1')).toBe(true);
    expect(set.has('1,1')).toBe(true);
  });

  test('blinker oscillates with period 2', async () => {
    // vertical blinker at (0,-1),(0,0),(0,1)
    const cells = [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }];
    const res1 = await advance(cells, 1);
    const set1 = new Set(res1.cells.map(p => `${p.x},${p.y}`));
    // After 1 step it should be horizontal: (-1,0),(0,0),(1,0)
    expect(set1.has('-1,0')).toBe(true);
    expect(set1.has('0,0')).toBe(true);
    expect(set1.has('1,0')).toBe(true);
    const res2 = await advance(res1.cells, 1);
    const set2 = new Set(res2.cells.map(p => `${p.x},${p.y}`));
    // Back to vertical
    expect(set2.has('0,-1')).toBe(true);
    expect(set2.has('0,0')).toBe(true);
    expect(set2.has('0,1')).toBe(true);
  });

  test('glider translates after 4 steps (translation test)', async () => {
    // a glider (orientation variant). We'll assert that after 4 steps
    // the pattern is identical up to translation to the original.
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: -1 }, { x: 1, y: -2 }];
    const res = await advance(cells, 4);
    const outSet = new Set(res.cells.map(p => `${p.x},${p.y}`));

    // Try to find a translation (dx,dy) such that translating original yields result
    let matched = false;
    for (const out of res.cells) {
      // assume original[0] maps to this out cell
      const dx = out.x - cells[0].x;
      const dy = out.y - cells[0].y;
      let ok = true;
      for (const c of cells) {
        if (!outSet.has(`${c.x + dx},${c.y + dy}`)) { ok = false; break; }
      }
      if (ok) { matched = true; break; }
    }
    expect(matched).toBe(true);
  });
});
