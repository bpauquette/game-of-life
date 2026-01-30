// Game DAO: core game logic/model state
import { create } from 'zustand';

export const useGameDao = create((set) => ({
  gameModel: null,
  setGameModel: (model) => set({ gameModel: model }),
  getLiveCells: () => new Map(),
  setGetLiveCells: (fn) => set({ getLiveCells: fn }),
}));
