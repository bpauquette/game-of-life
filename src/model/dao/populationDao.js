// Population DAO: population/generation tracking
import { create } from 'zustand';

export const usePopulationDao = create((set) => ({
  populationHistory: [],
  setPopulationHistory: (populationHistory) => set({ populationHistory }),
  popWindowSize: 30,
  setPopWindowSize: (popWindowSize) => set({ popWindowSize }),
  generation: 0,
  setGeneration: (generation) => set({ generation }),
  maxChartGenerations: 5000,
  setMaxChartGenerations: (maxChartGenerations) => set({ maxChartGenerations }),
}));
