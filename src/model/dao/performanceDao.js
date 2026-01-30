// Performance DAO: performance/caps/telemetry
import { create } from 'zustand';

export const usePerformanceDao = create((set) => ({
  performanceCaps: {
    maxFPS: 60,
    maxGPS: 30,
    enableFPSCap: false,
    enableGPSCap: false,
  },
  setPerformanceCaps: (updater) => set((state) => {
    const prev = state.performanceCaps;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return { performanceCaps: { ...prev, ...next } };
  }),
  memoryTelemetryEnabled: false,
  setMemoryTelemetryEnabled: (memoryTelemetryEnabled) => set({ memoryTelemetryEnabled }),
}));
