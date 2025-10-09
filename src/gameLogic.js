export const getNeighbors = (x, y) => {
  const neighbors = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx !== 0 || dy !== 0) neighbors.push([x + dx, y + dy]);
    }
  }
  return neighbors;
};

export const step = (liveCellsMap) => {
  const neighborCounts = new Map();

  liveCellsMap.forEach((_, key) => {
    const [x, y] = key.split(',').map(Number);
    getNeighbors(x, y).forEach(([nx, ny]) => {
      const nKey = `${nx},${ny}`;
      neighborCounts.set(nKey, (neighborCounts.get(nKey) || 0) + 1);
    });
  });

  const newMap = new Map();
  neighborCounts.forEach((count, key) => {
    if (count === 3 || (count === 2 && liveCellsMap.has(key))) newMap.set(key, true);
  });

  return newMap;
};
