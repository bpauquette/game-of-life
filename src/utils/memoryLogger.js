import logger from '../controller/utils/logger';

const MB = 1024 * 1024;
const DEFAULT_INTERVAL_MS = 60_000;
const MAX_SAMPLES = 500;

const canSampleMemory = () => {
  try {
    return typeof performance !== 'undefined' && performance?.memory && typeof performance.memory.usedJSHeapSize === 'number';
  } catch {
    return false;
  }
};

const getIntervalMs = (requestedInterval) => {
  const runtimeInterval = typeof window !== 'undefined' ? window.GOL_MEMORY_LOG_INTERVAL_MS : undefined;
  const parsedRuntime = Number(runtimeInterval);
  if (Number.isFinite(requestedInterval) && requestedInterval > 0) return requestedInterval;
  if (Number.isFinite(parsedRuntime) && parsedRuntime > 0) return parsedRuntime;
  const envInterval = typeof process !== 'undefined' ? Number(process?.env?.REACT_APP_MEMORY_LOG_INTERVAL_MS) : undefined;
  if (Number.isFinite(envInterval) && envInterval > 0) return envInterval;
  return DEFAULT_INTERVAL_MS;
};

function storeSample(sample) {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(window.__GOL_MEMORY_SAMPLES__)) {
    window.__GOL_MEMORY_SAMPLES__ = [];
  }
  const samples = window.__GOL_MEMORY_SAMPLES__;
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

/**
 * Periodically logs Chrome heap metrics (if available) without needing DevTools.
 * Gracefully no-ops on unsupported browsers.
 * @param {{ intervalMs?: number, enabled?: boolean, label?: string }} options
 * @returns {() => void} cleanup function
 */
export function startMemoryLogger(options = {}) {
  const enabledOverride = options.enabled;
  const runtimeFlag = typeof window !== 'undefined' ? window.GOL_MEMORY_LOGGER_ENABLED : undefined;
  const envFlag = typeof process !== 'undefined' ? process?.env?.REACT_APP_MEMORY_LOGGER : undefined;
  const shouldEnable = () => {
    if (typeof enabledOverride === 'boolean') return enabledOverride;
    if (typeof runtimeFlag === 'boolean') return runtimeFlag;
    if (envFlag === 'true' || envFlag === '1') return true;
    if (envFlag === 'false' || envFlag === '0') return false;
    // Default to on only in development/test to avoid noise in prod builds.
    const nodeEnv = typeof process !== 'undefined' ? process?.env?.NODE_ENV : undefined;
    return nodeEnv !== 'production';
  };

  if (!shouldEnable()) {
    return () => {};
  }

  if (!canSampleMemory()) {
    logger.info('[MemoryLogger] performance.memory not available; skipping periodic sampling');
    return () => {};
  }

  const label = options.label || 'Memory';
  const intervalMs = getIntervalMs(options.intervalMs);
  let prevUsed = performance.memory.usedJSHeapSize;

  const logSample = () => {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const delta = usedJSHeapSize - prevUsed;
    prevUsed = usedJSHeapSize;
    const sample = {
      ts: Date.now(),
      usedMB: Number((usedJSHeapSize / MB).toFixed(2)),
      totalMB: Number((totalJSHeapSize / MB).toFixed(2)),
      limitMB: Number((jsHeapSizeLimit / MB).toFixed(2)),
      deltaMB: Number((delta / MB).toFixed(2))
    };
    storeSample(sample);
    logger.info(
      `[${label}] used=${sample.usedMB}MB total=${sample.totalMB}MB limit=${sample.limitMB}MB Δ=${sample.deltaMB}MB`
    );
  };

  logSample();
  const timer = window.setInterval(logSample, intervalMs);
  return () => {
    if (timer) window.clearInterval(timer);
  };
}
