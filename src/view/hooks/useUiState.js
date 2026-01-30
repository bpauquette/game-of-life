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
    showStableDialog: useUiDao(state => state.showStableDialog),
    setShowStableDialog: useUiDao(state => state.setShowStableDialog),
    shapesNotifOpen: useUiDao(state => state.shapesNotifOpen),
    setShapesNotifOpen: useUiDao(state => state.setShapesNotifOpen),
    loginNotifOpen: useUiDao(state => state.loginNotifOpen),
    setLoginNotifOpen: useUiDao(state => state.setLoginNotifOpen),
    loginNotifMessage: useUiDao(state => state.loginNotifMessage),
    setLoginNotifMessage: useUiDao(state => state.setLoginNotifMessage),
    showDuplicateDialog: useUiDao(state => state.showDuplicateDialog),
    setShowDuplicateDialog: useUiDao(state => state.setShowDuplicateDialog),
    duplicateShape: useUiDao(state => state.duplicateShape),
    setDuplicateShape: useUiDao(state => state.setDuplicateShape),
    showFirstLoadWarning: useUiDao(state => state.showFirstLoadWarning),
    setShowFirstLoadWarning: useUiDao(state => state.setShowFirstLoadWarning),
  };
}
