// Game DAO: core game logic/model state
import { create } from 'zustand';

export const useGameDao = create((set) => ({
  gameModel: null,
  setGameModel: (model) => set({ gameModel: model }),
  getLiveCells: () => new Map(),
  setGetLiveCells: (fn) => set({ getLiveCells: fn }),
  setCellAlive: (x, y, alive) => {
    console.log('[gameDao] setCellAlive called', { x, y, alive });
  },
  setSetCellAlive: (fn) => set({ setCellAlive: fn }),
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  engineMode: 'default',
  setEngineMode: (engineMode) => set({ engineMode }),
  isHashlifeMode: false,
  useHashlife: false,
  generationBatchSize: 1,
  setGenerationBatchSize: (generationBatchSize) => set({ generationBatchSize }),
  steadyInfo: { steady: false, period: 0, popChanging: false },
  setSteadyInfo: (info) => set({ steadyInfo: info }),
}));
