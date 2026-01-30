// Extracted from GameOfLifeApp.js
// Provides game state selectors from gameDao
import { useGameDao } from '../../model/dao/gameDao.js';

export { useGameDao };

export function useGameState() {
  return {
    isRunning: useGameDao(state => state.isRunning),
    setIsRunning: useGameDao(state => state.setIsRunning),
    engineMode: useGameDao(state => state.engineMode),
    setEngineMode: useGameDao(state => state.setEngineMode),
    isHashlifeMode: useGameDao(state => state.isHashlifeMode),
    useHashlife: useGameDao(state => state.useHashlife),
    generationBatchSize: useGameDao(state => state.generationBatchSize),
    setGenerationBatchSize: useGameDao(state => state.setGenerationBatchSize),
    steadyInfo: useGameDao(state => state.steadyInfo),
    setSteadyInfo: useGameDao(state => state.setSteadyInfo),
  };
}
