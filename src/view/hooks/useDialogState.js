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
  };
}
