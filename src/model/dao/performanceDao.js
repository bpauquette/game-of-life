// Performance DAO: performance/caps/telemetry
import { create } from 'zustand';

const clampNumber = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const readStoredNumber = (key, min, max, fallback) => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return clampNumber(parsed, min, max, fallback);
  } catch (e) {
    console.error(`[performanceDao] failed to read ${key} from localStorage:`, e);
  }
  return fallback;
};

const readStoredBool = (key, fallback = false) => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw === 'true' || raw === 'false') return raw === 'true';
  } catch (e) {
    console.error(`[performanceDao] failed to read ${key} from localStorage:`, e);
  }
  return fallback;
};

const persistCaps = (caps) => {
  try {
    globalThis.localStorage?.setItem('maxFPS', String(caps.maxFPS));
    globalThis.localStorage?.setItem('maxGPS', String(caps.maxGPS));
    globalThis.localStorage?.setItem('enableFPSCap', JSON.stringify(!!caps.enableFPSCap));
    globalThis.localStorage?.setItem('enableGPSCap', JSON.stringify(!!caps.enableGPSCap));
  } catch (e) {
    console.error('[performanceDao] failed to persist performanceCaps:', e);
  }
};

export const usePerformanceDao = create((set) => {
  const initialCaps = {
    maxFPS: readStoredNumber('maxFPS', 1, 120, 60),
    maxGPS: readStoredNumber('maxGPS', 1, 60, 30),
    enableFPSCap: readStoredBool('enableFPSCap', false),
    enableGPSCap: readStoredBool('enableGPSCap', false),
  };

  return {
    performanceCaps: initialCaps,
    setPerformanceCaps: (updater) => set((state) => {
      const prev = state.performanceCaps;
      const nextInput = typeof updater === 'function' ? updater(prev) : updater;
      const next = {
        maxFPS: clampNumber(nextInput?.maxFPS ?? prev.maxFPS, 1, 120, prev.maxFPS),
        maxGPS: clampNumber(nextInput?.maxGPS ?? prev.maxGPS, 1, 60, prev.maxGPS),
        enableFPSCap: typeof nextInput?.enableFPSCap === 'boolean' ? nextInput.enableFPSCap : prev.enableFPSCap,
        enableGPSCap: typeof nextInput?.enableGPSCap === 'boolean' ? nextInput.enableGPSCap : prev.enableGPSCap,
      };
      persistCaps(next);
      return { performanceCaps: next };
    }),
    memoryTelemetryEnabled: readStoredBool('memoryTelemetryEnabled', false),
    setMemoryTelemetryEnabled: (memoryTelemetryEnabled) => {
      const enabled = !!memoryTelemetryEnabled;
      try {
        globalThis.localStorage?.setItem('memoryTelemetryEnabled', enabled ? 'true' : 'false');
      } catch (e) {
        console.error('[performanceDao] failed to persist memoryTelemetryEnabled:', e);
      }
      set({ memoryTelemetryEnabled: enabled });
    },
  };
});
