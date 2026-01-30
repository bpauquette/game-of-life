// Extracted from GameOfLifeApp.js
// Provides tool state selectors from toolDao
import { useToolDao } from '../../model/dao/toolDao.js';

export function useToolState() {
  return {
    selectedTool: useToolDao(state => state.selectedTool),
    setSelectedTool: useToolDao(state => state.setSelectedTool),
    toolState: useToolDao(state => state.toolState),
    setToolState: useToolDao(state => state.setToolState),
    selectedShape: useToolDao(state => state.selectedShape),
    setSelectedShape: useToolDao(state => state.setSelectedShape),
    randomRectPercent: useToolDao(state => state.randomRectPercent),
    setRandomRectPercent: useToolDao(state => state.setRandomRectPercent),
  };
}
