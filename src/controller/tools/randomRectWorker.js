// randomRectWorker.js
// Web Worker for computing random rectangle cell states

globalThis.onmessage = function(e) {
  const { x0, y0, x1, y1, prob } = e.data;
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const p = Math.max(0, Math.min(1, prob ?? 0.5));

  const cells = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      // Use Math.random in worker context
      const alive = Math.random() < p;
      cells.push({ x, y, alive });
    }
  }

  globalThis.postMessage({ cells });
};
