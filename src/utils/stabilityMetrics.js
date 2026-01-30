const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

const clampWindow = (globalThisSize, historyLength) => {
  const normalized = Math.max(1, Math.floor(Number(globalThisSize) || 1));
  const maxWindow = Math.max(1, historyLength - 1);
  return Math.min(normalized, maxWindow);
};

const coerceTolerance = (tolerance) => {
  const num = Number(tolerance);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

export function computePopulationChange(history = [], globalThisSize = 1, tolerance = 0) {
  if (!Array.isArray(history) || history.length < 2) {
    return { delta: 0, popChanging: true };
  }

  const latest = toNumber(history.at(-1));
  if (!Number.isFinite(latest)) {
    return { delta: 0, popChanging: true };
  }

  const lookback = clampWindow(globalThisSize, history.length);
  const comparisonIndex = Math.max(0, history.length - 1 - lookback);
  const comparison = toNumber(history[comparisonIndex]);
  if (!Number.isFinite(comparison)) {
    return { delta: 0, popChanging: true };
  }

  const delta = latest - comparison;
  const threshold = coerceTolerance(tolerance);
  return {
    delta,
    popChanging: Math.abs(delta) > threshold
  };
}

export function shouldTrackSteadyState(enabled) {
  if (typeof enabled === 'boolean') return enabled;
  return !!enabled;
}
