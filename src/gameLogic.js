// Game of Life constants
const NEIGHBOR_RANGE_MIN = -1;
const NEIGHBOR_RANGE_MAX = 1;
const BIRTH_NEIGHBOR_COUNT = 3;
const SURVIVAL_NEIGHBOR_COUNT = 2;
const DEFAULT_NEIGHBOR_COUNT = 0;

export const getNeighbors = (x, y) => {
  const neighbors = [];
  for (let dx = NEIGHBOR_RANGE_MIN; dx <= NEIGHBOR_RANGE_MAX; dx++) {
    for (let dy = NEIGHBOR_RANGE_MIN; dy <= NEIGHBOR_RANGE_MAX; dy++) {
      if (dx !== 0 || dy !== 0) neighbors.push([x + dx, y + dy]);
    }
  }
  return neighbors;
};

export const step = (liveCellsMap) => {
  const neighborCounts = new Map();
  for (const key of liveCellsMap.keys()) {
    const [x, y] = key.split(',').map(Number);
    for (const [nx, ny] of getNeighbors(x, y)) {
      const nKey = `${nx},${ny}`;
      neighborCounts.set(nKey, (neighborCounts.get(nKey) || DEFAULT_NEIGHBOR_COUNT) + 1);
    }
  }

  const newMap = new Map();
  for (const [key, count] of neighborCounts.entries()) {
    if (count === BIRTH_NEIGHBOR_COUNT || (count === SURVIVAL_NEIGHBOR_COUNT && liveCellsMap.has(key))) newMap.set(key, true);
  }

  return newMap;
};
