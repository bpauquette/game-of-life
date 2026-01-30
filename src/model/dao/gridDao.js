// Grid DAO: grid state and logic
import { create } from 'zustand';

export const useGridDao = create((set) => ({
  grid: [],
  setGrid: (grid) => set({ grid }),
  gridSize: 64,
  setGridSize: (size) => set({ gridSize: size }),
}));
