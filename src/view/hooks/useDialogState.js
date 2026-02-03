// Extracted from GameOfLifeApp.js
// Provides dialog state selectors from dialogDao
import { useDialogDao } from '../../model/dao/dialogDao.js';

export function useDialogState() {
  return {
    captureDialogOpen: useDialogDao(state => state.captureDialogOpen),
    setCaptureDialogOpen: useDialogDao(state => state.setCaptureDialogOpen),
    captureData: useDialogDao(state => state.captureData),
    setCaptureData: useDialogDao(state => state.setCaptureData),
    myShapesDialogOpen: useDialogDao(state => state.myShapesDialogOpen),
    setMyShapesDialogOpen: useDialogDao(state => state.setMyShapesDialogOpen),
    importDialogOpen: useDialogDao(state => state.importDialogOpen),
    setImportDialogOpen: useDialogDao(state => state.setImportDialogOpen),
    showStableDialog: useDialogDao(state => state.showStableDialog),
    setShowStableDialog: useDialogDao(state => state.setShowStableDialog),
    showFirstLoadWarning: useDialogDao(state => state.showFirstLoadWarning),
    setShowFirstLoadWarning: useDialogDao(state => state.setShowFirstLoadWarning),
    shapesNotifOpen: useDialogDao(state => state.shapesNotifOpen),
    setShapesNotifOpen: useDialogDao(state => state.setShapesNotifOpen),
    loginNotifOpen: useDialogDao(state => state.loginNotifOpen),
    setLoginNotifOpen: useDialogDao(state => state.setLoginNotifOpen),
    loginNotifMessage: useDialogDao(state => state.loginNotifMessage),
    setLoginNotifMessage: useDialogDao(state => state.setLoginNotifMessage),
    showDuplicateDialog: useDialogDao(state => state.showDuplicateDialog),
    setShowDuplicateDialog: useDialogDao(state => state.setShowDuplicateDialog),
    duplicateShape: useDialogDao(state => state.duplicateShape),
    setDuplicateShape: useDialogDao(state => state.setDuplicateShape),
  };
}
