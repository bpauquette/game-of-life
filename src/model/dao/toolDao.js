// Tool DAO: tool selection/state
import { create } from 'zustand';

export const useToolDao = create((set) => ({
  selectedTool: 'draw',
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  toolState: {},
  setToolState: (toolState) => set({ toolState }),
  // Recent shapes state
  recentShapes: [],
  setRecentShapes: (recentShapes) => set({ recentShapes }),
  recentShapesPersistence: {},
  setRecentShapesPersistence: (recentShapesPersistence) => set({ recentShapesPersistence }),
  onSaveRecentShapes: (shapes) => set({ recentShapes: shapes }),
  onClearRecentShapes: () => set({ recentShapes: [] }),
  setSelectedShape: (shape) => set({ selectedShape: shape }),
  onSelectShape: (shape) => set({ selectedShape: shape }),
  onRotateShape: (shape) => set({ selectedShape: shape }),
  onSwitchToShapesTool: () => set({ selectedTool: 'shapes' }),
}));
