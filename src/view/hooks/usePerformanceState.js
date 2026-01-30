// Extracted from GameOfLifeApp.js
// Provides performance state selectors from performanceDao
import { usePerformanceDao } from '../../model/dao/performanceDao.js';

export function usePerformanceState() {
  return {
    performanceCaps: usePerformanceDao(state => state.performanceCaps),
    setPerformanceCaps: usePerformanceDao(state => state.setPerformanceCaps),
    memoryTelemetryEnabled: usePerformanceDao(state => state.memoryTelemetryEnabled),
    setMemoryTelemetryEnabled: usePerformanceDao(state => state.setMemoryTelemetryEnabled),
  };
}
