import { getNeighbors, step } from './gameLogic';

describe('getNeighbors', () => {
  it('returns 8 neighbors for a central cell', () => {
    const n = getNeighbors(0, 0);
    expect(n.length).toBe(8);
    expect(n).toEqual(expect.arrayContaining([[ -1, -1 ], [ -1, 0 ], [ -1, 1 ], [ 0, -1 ], [ 0, 1 ], [ 1, -1 ], [ 1, 0 ], [ 1, 1 ]]));
  });

  it('neighbors are relative', () => {
    const n = getNeighbors(10, 5);
    expect(n).toContainEqual([9,4]);
    expect(n).toContainEqual([11,6]);
  });
});

describe('step', () => {
  it('keeps a blinker oscillating', () => {
    // blinker horizontal at y=0: (-1,0),(0,0),(1,0)
    const live = new Map();
    live.set('-1,0', true);
    live.set('0,0', true);
    live.set('1,0', true);

    const next = step(live);
    // next should be vertical blinker at x=0: (0,-1),(0,0),(0,1)
    expect(next.has('0,-1')).toBe(true);
    expect(next.has('0,0')).toBe(true);
    expect(next.has('0,1')).toBe(true);
    expect(next.size).toBe(3);

    const next2 = step(next);
    // back to horizontal
    expect(next2.has('-1,0')).toBe(true);
    expect(next2.has('0,0')).toBe(true);
    expect(next2.has('1,0')).toBe(true);
    expect(next2.size).toBe(3);
  });

  it('births and kills correctly for block (still life)', () => {
    const live = new Map();
    live.set('0,0', true);
    live.set('1,0', true);
    live.set('0,1', true);
    live.set('1,1', true);

    const next = step(live);
    expect(next.size).toBe(4);
    expect(next.has('0,0')).toBe(true);
    expect(next.has('1,0')).toBe(true);
    expect(next.has('0,1')).toBe(true);
    expect(next.has('1,1')).toBe(true);
  });

  it('handles empty world', () => {
    const live = new Map();
    const next = step(live);
    expect(next.size).toBe(0);
  });
});
