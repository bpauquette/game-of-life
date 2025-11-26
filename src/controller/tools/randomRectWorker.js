// randomRectWorker.js
// Web Worker for computing random rectangle cell states

globalThis.onmessage = function(e) {
  const { x0, y0, x1, y1, prob } = e.data;
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  let p = 0;
  if (typeof prob === 'number' && Number.isFinite(prob)) {
    p = Math.max(0, Math.min(1, prob));
  } else {
    // If prob missing or invalid, default to 0 (no cells alive)
    p = 0;
    // No console here; keep worker quiet but deterministic
  }

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
