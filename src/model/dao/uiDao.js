// UI DAO: UI controls/dialogs

import { create } from 'zustand';

// Helper to get ADA compliance default from localStorage (default true)
function getInitialAdaCompliance() {
  try {
    const stored = globalThis?.localStorage?.getItem('enableAdaCompliance');
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch (e) {
    console.error('getInitialAdaCompliance error:', e);
  }
  return true;
}

export const useUiDao = create((set) => ({
  // UI state
  uiState: {},
  setUiState: (uiState) => set({ uiState }),
  showUIControls: true,
  setShowUIControls: (showUIControls) => set({ showUIControls }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  showChart: false,
  setShowChart: (showChart) => set({ showChart }),
  showStableDialog: false,
  setShowStableDialog: (open) => set({ showStableDialog: open }),
  shapesNotifOpen: false,
  setShapesNotifOpen: (open) => set({ shapesNotifOpen: open }),
  loginNotifOpen: false,
  setLoginNotifOpen: (open) => set({ loginNotifOpen: open }),
  loginNotifMessage: '',
  setLoginNotifMessage: (msg) => set({ loginNotifMessage: msg }),
  showDuplicateDialog: false,
  setShowDuplicateDialog: (open) => set({ showDuplicateDialog: open }),
  duplicateShape: null,
  setDuplicateShape: (shape) => set({ duplicateShape: shape }),
  showFirstLoadWarning: false,
  setShowFirstLoadWarning: (open) => set({ showFirstLoadWarning: open }),
  // Dialog state
  captureDialogOpen: false,
  setCaptureDialogOpen: (open) => set({ captureDialogOpen: open }),
  captureData: null,
  setCaptureData: (data) => set({ captureData: data }),
  myShapesDialogOpen: false,
  setMyShapesDialogOpen: (open) => set({ myShapesDialogOpen: open }),
  importDialogOpen: false,
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
  onClosePalette: () => set({ paletteOpen: false }),
  onPaletteSelect: (shape) => set({ selectedShape: shape }),
  onCloseCaptureDialog: () => set({ captureDialogOpen: false }),
  onSaveCapture: (data) => set({ captureData: data }),
  onCloseMyShapesDialog: () => set({ myShapesDialogOpen: false }),
  onOpenMyShapes: () => set({ myShapesDialogOpen: true }),
  onImportSuccess: () => {},
  onCloseChart: () => set({ showChart: false }),

  // ADA compliance state (default true unless explicitly set to false)
  enableAdaCompliance: getInitialAdaCompliance(),
  setEnableAdaCompliance: (value) => {
    const boolValue = Boolean(value);
    set({ enableAdaCompliance: boolValue });
    try {
      globalThis?.localStorage?.setItem('enableAdaCompliance', JSON.stringify(boolValue));
    } catch (e) {
      console.error('setEnableAdaCompliance error:', e);
    }
  },
}));
