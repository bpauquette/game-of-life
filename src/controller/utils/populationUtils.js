// populationUtils.js
// Small utility for population stability checks.

export function isPopulationStable(history, windowSize, tolerance) {
  if (!history || history.length < 2) return false;
  const w = Math.max(1, Math.min(windowSize, history.length));
  const slice = history.slice(-w);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < slice.length; i++) {
    const v = slice[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min <= tolerance;
}

export default isPopulationStable;
