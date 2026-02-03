// Extracted from GameOfLifeApp.js
// Provides population state selectors from populationDao
import { usePopulationDao } from '../../model/dao/populationDao.js';

export function usePopulationState() {
  return {
    populationHistory: usePopulationDao(state => state.populationHistory),
    setPopulationHistory: usePopulationDao(state => state.setPopulationHistory),
    popWindowSize: usePopulationDao(state => state.popWindowSize),
    setPopWindowSize: usePopulationDao(state => state.setPopWindowSize),
    popTolerance: usePopulationDao(state => state.popTolerance),
    setPopTolerance: usePopulationDao(state => state.setPopTolerance),
    generation: usePopulationDao(state => state.generation),
    setGeneration: usePopulationDao(state => state.setGeneration),
    maxChartGenerations: usePopulationDao(state => state.maxChartGenerations),
    setMaxChartGenerations: usePopulationDao(state => state.setMaxChartGenerations),
    stableDetectionInfo: usePopulationDao(state => state.stableDetectionInfo),
    setStableDetectionInfo: usePopulationDao(state => state.setStableDetectionInfo),
  };
}
