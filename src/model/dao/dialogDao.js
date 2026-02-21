// Dialog DAO: dialogs and notifications
import { create } from 'zustand';

function getInitialShowFirstLoadWarning() {
  try {
    return globalThis?.localStorage?.getItem('gol-first-load-warning-seen') !== 'true';
  } catch (e) {
    console.error('getInitialShowFirstLoadWarning error:', e);
  }
  return true;
}

export const useDialogDao = create((set) => ({
  captureDialogOpen: false,
  setCaptureDialogOpen: (captureDialogOpen) => set({ captureDialogOpen }),
  myShapesDialogOpen: false,
  setMyShapesDialogOpen: (myShapesDialogOpen) => set({ myShapesDialogOpen }),
  importDialogOpen: false,
  setImportDialogOpen: (importDialogOpen) => set({ importDialogOpen }),
  captureData: null,
  setCaptureData: (captureData) => set({ captureData }),
  showStableDialog: false,
  setShowStableDialog: (showStableDialog) => set({ showStableDialog }),
  showFirstLoadWarning: getInitialShowFirstLoadWarning(),
  setShowFirstLoadWarning: (showFirstLoadWarning) => set({ showFirstLoadWarning }),
  shapesNotifOpen: false,
  setShapesNotifOpen: (shapesNotifOpen) => set({ shapesNotifOpen }),
  loginNotifOpen: false,
  setLoginNotifOpen: (loginNotifOpen) => set({ loginNotifOpen }),
  loginNotifMessage: '',
  setLoginNotifMessage: (loginNotifMessage) => set({ loginNotifMessage }),
  duplicateShape: null,
  setDuplicateShape: (duplicateShape) => set({ duplicateShape }),
  showDuplicateDialog: false,
  setShowDuplicateDialog: (showDuplicateDialog) => set({ showDuplicateDialog }),
}));
