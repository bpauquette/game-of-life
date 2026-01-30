import { ticks as gameTicks } from '../model/gameLogic.js';

// Hashlife engine is CommonJS in src/hashlife
 
const { advance, clearEngineCache } = require('../hashlife/engine.js');

function indexToCells(liveIndex) {
  const cells = [];
  if (!liveIndex || typeof liveIndex.forEachCell !== 'function') return cells;
  liveIndex.forEachCell((x, y) => {
    cells.push({ x, y });
  });
  return cells;
}

function setFromCells(cells) {
  const s = new Set();
  for (const c of cells) {
    s.add(`${c.x},${c.y}`);
  }
  return s;
}

describe('Hashlife correctness vs gameLogic.ticks', () => {
  beforeEach(() => {
    clearEngineCache();
  });

  async function expectSameAfterSteps(initialCells, steps) {
    const hashlifeResult = await advance(initialCells, steps);
    const hashlifeSet = setFromCells(hashlifeResult.cells || []);

    const bruteIndex = gameTicks(initialCells, steps);
    const bruteCells = indexToCells(bruteIndex);
    const bruteSet = setFromCells(bruteCells);

    expect(hashlifeSet).toEqual(bruteSet);
  }

  test('block, blinker, and glider match for 1 step', async () => {
    const block = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ];

    const blinker = [
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: 0, y: 1 }
    ];

    const glider = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: -1 },
      { x: 1, y: -2 }
    ];

    await expectSameAfterSteps(block, 1);
    await expectSameAfterSteps(blinker, 1);
    await expectSameAfterSteps(glider, 1);
  });

  test('random 16x16 pattern matches for up to 8 steps', async () => {
    const cells = [];
    const rng = () => Math.random();
    const size = 16;
    for (let x = -size; x < size; x++) {
      for (let y = -size; y < size; y++) {
        if (rng() < 0.15) cells.push({ x, y });
      }
    }

    await expectSameAfterSteps(cells, 1);
    await expectSameAfterSteps(cells, 2);
    await expectSameAfterSteps(cells, 4);
    await expectSameAfterSteps(cells, 8);
  });
});
