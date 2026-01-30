// Dialog DAO: dialogs and notifications
import { create } from 'zustand';

export const useDialogDao = create((set) => ({
  captureDialogOpen: false,
  setCaptureDialogOpen: (captureDialogOpen) => set({ captureDialogOpen }),
  myShapesDialogOpen: false,
  setMyShapesDialogOpen: (myShapesDialogOpen) => set({ myShapesDialogOpen }),
  importDialogOpen: false,
  setImportDialogOpen: (importDialogOpen) => set({ importDialogOpen }),
  captureData: null,
  setCaptureData: (captureData) => set({ captureData }),
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
