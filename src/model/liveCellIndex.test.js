import LiveCellIndex from './liveCellIndex.js';

describe('LiveCellIndex', () => {
  it('can set and check cells', () => {
    const idx = new LiveCellIndex();
    idx.setCellAlive(1, 2, true);
    expect(idx.has(1, 2)).toBe(true);
    expect(idx.has(2, 2)).toBe(false);
  });
  it('can delete cells', () => {
    const idx = new LiveCellIndex();
    idx.setCellAlive(1, 2, true);
    idx.delete(1, 2);
    expect(idx.has(1, 2)).toBe(false);
  });
  it('can clear all cells', () => {
    const idx = new LiveCellIndex();
    idx.setCellAlive(1, 2, true);
    idx.clear();
    expect(idx.has(1, 2)).toBe(false);
  });
  it('can convert to array', () => {
    const idx = new LiveCellIndex();
    idx.setCellAlive(1, 2, true);
    idx.setCellAlive(3, 4, true);
    const arr = idx.toArray();
    expect(arr).toEqual(expect.arrayContaining([{ x: 1, y: 2 }, { x: 3, y: 4 }]));
  });
});
