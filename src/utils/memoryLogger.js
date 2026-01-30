import logger from '../controller/utils/logger.js';

const MB = 1024 * 1024;
const DEFAULT_INTERVAL_MS = 5_000;
const MAX_SAMPLES = 500;
const DEFAULT_UPLOAD_URL = '/v1/memory-samples';
const DEFAULT_UPLOAD_INTERVAL = 5 * DEFAULT_INTERVAL_MS;

const canSampleMemory = () => {
  try {
    return typeof performance !== 'undefined' && performance?.memory && typeof performance.memory.usedJSHeapSize === 'number';
  } catch {
    return false;
  }
};

const getIntervalMs = (requestedInterval) => {
  const runtimeInterval = typeof globalThis !== 'undefined' ? globalThis.GOL_MEMORY_LOG_INTERVAL_MS : undefined;
  const parsedRuntime = Number(runtimeInterval);
  if (Number.isFinite(requestedInterval) && requestedInterval > 0) return requestedInterval;
  if (Number.isFinite(parsedRuntime) && parsedRuntime > 0) return parsedRuntime;
  const envInterval = typeof process !== 'undefined' ? Number(process?.env?.REACT_APP_MEMORY_LOG_INTERVAL_MS) : undefined;
  if (Number.isFinite(envInterval) && envInterval > 0) return envInterval;
  return DEFAULT_INTERVAL_MS;
};

function storeSample(sample) {
  if (typeof globalThis === 'undefined') return;
  if (!Array.isArray(globalThis.__GOL_MEMORY_SAMPLES__)) {
    globalThis.__GOL_MEMORY_SAMPLES__ = [];
  }
  const samples = globalThis.__GOL_MEMORY_SAMPLES__;
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
  return samples;
}

function resolveUploadTarget(requestedUrl) {
  if (typeof requestedUrl === 'string') return requestedUrl;
  const runtimeUrl = typeof globalThis !== 'undefined' ? globalThis.GOL_MEMORY_UPLOAD_URL : undefined;
  if (typeof runtimeUrl === 'string' && runtimeUrl.length > 0) return runtimeUrl;
  const envUrl = typeof process !== 'undefined' ? process?.env?.REACT_APP_MEMORY_UPLOAD_URL : undefined;
  if (typeof envUrl === 'string' && envUrl.length > 0) return envUrl;
  return DEFAULT_UPLOAD_URL;
}

function shouldUpload(enabled) {
  if (typeof enabled === 'boolean') return enabled;
  const runtimeFlag = typeof globalThis !== 'undefined' ? globalThis.GOL_MEMORY_UPLOAD_ENABLED : undefined;
  if (typeof runtimeFlag === 'boolean') return runtimeFlag;
  const envFlag = typeof process !== 'undefined' ? process?.env?.REACT_APP_MEMORY_UPLOAD_ENABLED : undefined;
  if (envFlag === 'true' || envFlag === '1') return true;
  if (envFlag === 'false' || envFlag === '0') return false;
  // default off unless explicitly enabled
  return false;
}

const safeRandomId = () => {
  try {
    return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
};

const sendBeaconIfAvailable = (url, payload) => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  try {
    const ok = navigator.sendBeacon(url, JSON.stringify(payload));
    if (!ok) logger.warn('[MemoryLogger] sendBeacon upload rejected');
    return ok;
  } catch (err) {
    logger.warn('[MemoryLogger] sendBeacon upload error', err);
    return false;
  }
};

async function uploadSamples(samples, { url, signal }) {
  if (!samples || samples.length === 0) return true;
  if (typeof fetch !== 'function') {
    return sendBeaconIfAvailable(url, { samples, clientTime: Date.now() });
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples,
        clientTime: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }),
      keepalive: true,
      signal
    });
    if (!res.ok) {
      logger.warn('[MemoryLogger] upload failed with status', res.status);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('[MemoryLogger] upload error', err);
    return false;
  }
}

/**
 * Periodically logs Chrome heap metrics (if available) without needing DevTools.
 * Gracefully no-ops on unsupported browsers.
 * @param {{ intervalMs?: number, enabled?: boolean, label?: string, uploadEnabled?: boolean, uploadUrl?: string, uploadIntervalMs?: number, batchSize?: number }} options
 * @returns {() => void} cleanup function
 */
export function startMemoryLogger(options = {}) {
  const enabledOverride = options.enabled;
  const runtimeFlag = typeof globalThis !== 'undefined' ? globalThis.GOL_MEMORY_LOGGER_ENABLED : undefined;
  const envFlag = typeof process !== 'undefined' ? process?.env?.REACT_APP_MEMORY_LOGGER : undefined;
  const shouldEnable = () => {
    if (typeof enabledOverride === 'boolean') return enabledOverride;
    if (typeof runtimeFlag === 'boolean') return runtimeFlag;
    if (envFlag === 'true' || envFlag === '1') return true;
    if (envFlag === 'false' || envFlag === '0') return false;
    // Default to on unless explicitly disabled so telemetry is always collected.
    return true;
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
  const uploadEnabled = shouldUpload(options.uploadEnabled);
  const uploadUrl = resolveUploadTarget(options.uploadUrl);
  const uploadInterval = Number.isFinite(options.uploadIntervalMs) && options.uploadIntervalMs > 0
    ? options.uploadIntervalMs
    : DEFAULT_UPLOAD_INTERVAL;
  const batchSize = Number.isFinite(options.batchSize) && options.batchSize > 0 ? options.batchSize : 10;
  const uploadQueue = [];
  const sessionId = (typeof globalThis !== 'undefined' && globalThis.GOL_MEMORY_SESSION_ID) || safeRandomId();
  if (typeof globalThis !== 'undefined' && !globalThis.GOL_MEMORY_SESSION_ID) {
    globalThis.GOL_MEMORY_SESSION_ID = sessionId;
  }
  let uploadTimer = null;
  let uploadAbortController = null;
  let uploadInFlight = false;

  const flushUploadQueue = async () => {
    if (!uploadEnabled || uploadQueue.length === 0 || uploadInFlight) return;
    uploadInFlight = true;
    const payload = uploadQueue.slice();
    uploadAbortController = new AbortController();
    const enriched = payload.map((sample) => ({ ...sample, sessionId }));
    const ok = await uploadSamples(enriched, { url: uploadUrl, signal: uploadAbortController.signal });
    if (ok) {
      uploadQueue.splice(0, payload.length);
    }
    uploadInFlight = false;
  };

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
    if (uploadEnabled) {
      uploadQueue.push(sample);
      if (uploadQueue.length >= batchSize) {
        flushUploadQueue();
      }
    }
    logger.info(
      `[${label}] used=${sample.usedMB}MB total=${sample.totalMB}MB limit=${sample.limitMB}MB Δ=${sample.deltaMB}MB`
    );
  };

  logSample();
  const timer = globalThis.setInterval(logSample, intervalMs);
  if (uploadEnabled) {
    uploadTimer = globalThis.setInterval(flushUploadQueue, uploadInterval);
    if (typeof globalThis !== 'undefined' && typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('beforeunload', () => {
        if (uploadQueue.length > 0) {
          sendBeaconIfAvailable(uploadUrl, { samples: uploadQueue.slice(0, batchSize), sessionId });
        }
      });
    }
  }
  return () => {
    if (timer) globalThis.clearInterval(timer);
    if (uploadTimer) globalThis.clearInterval(uploadTimer);
    if (uploadAbortController) uploadAbortController.abort();
  };
}
