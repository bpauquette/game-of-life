const adapter = require('../adapter');
const engine = require('../engine');

describe('hashlife adapter', () => {
  beforeEach(() => engine.clearEngineCache());

  test('adapter.run returns same result as engine.advance (fallback)', async () => {
    const cells = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: -1 }, { x: 1, y: -2 }];
    const r1 = await engine.advance(cells, 4);
    const r2 = await adapter.run(cells, 4);
    const s1 = new Set(r1.cells.map(p => `${p.x},${p.y}`));
    const s2 = new Set(r2.cells.map(p => `${p.x},${p.y}`));
    expect(s1.size).toBe(s2.size);
    for (const p of s1) expect(s2.has(p)).toBe(true);
  });
});
