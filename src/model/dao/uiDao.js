// UI DAO: UI controls/dialogs
import { create } from 'zustand';

export const useUiDao = create((set) => ({
  // UI state
  uiState: {},
  setUiState: (uiState) => set({ uiState }),
  showUIControls: true,
  setShowUIControls: (showUIControls) => set({ showUIControls }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  showSpeedGauge: true,
  setShowSpeedGauge: (show) => set({ showSpeedGauge: show }),
  colorScheme: null,
  setColorScheme: (colorScheme) => set({ colorScheme }),
  colorSchemeKey: 'bio',
  setColorSchemeKey: (colorSchemeKey) => set({ colorSchemeKey }),
  cellSize: 8,
  setCellSize: (cellSize) => set({ cellSize }),
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
}));
