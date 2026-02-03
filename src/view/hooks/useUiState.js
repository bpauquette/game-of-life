// Extracted from GameOfLifeApp.js
// Provides UI/dialog state selectors from uiDao
import { useUiDao } from '../../model/dao/uiDao.js';

export { useUiDao };

export function useUiState() {
  return {
    paletteOpen: useUiDao(state => state.paletteOpen),
    setPaletteOpen: useUiDao(state => state.setPaletteOpen),
    showChart: useUiDao(state => state.showChart),
    setShowChart: useUiDao(state => state.setShowChart),
    showUIControls: useUiDao(state => state.showUIControls),
    setShowUIControls: useUiDao(state => state.setShowUIControls),
  };
}
