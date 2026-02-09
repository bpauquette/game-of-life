// Direct global getter for ADA compliance (for model-layer enforcement)
// UI DAO: UI controls/dialogs

import { create } from 'zustand';
import { colorSchemes } from '../colorSchemes.js';
export function getEnableAdaCompliance() {
  let value;
  try {
    // Prefer global in-memory flag if present
    if (typeof globalThis !== 'undefined' && typeof globalThis.ADA_ENABLED !== 'undefined') {
      value = globalThis.ADA_ENABLED;
    } else if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      const stored = globalThis.localStorage.getItem('enableAdaCompliance');
      if (stored === 'false') value = false;
      else if (stored === 'true') value = true;
    }
  } catch (e) {
    console.error('[ADA] Error in getEnableAdaCompliance:', e);
  }
  // Only enforce at the model layer when explicitly enabled.
  // Runtime/UI layers still enforce ADA defaults for normal app usage.
  if (typeof value === 'undefined') value = false;
  return value;
}

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

// Helper to get initial worker preference
function getInitialUseWebWorker() {
  try {
    const stored = globalThis?.localStorage?.getItem('useWebWorker');
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch (e) {
    console.error('getInitialUseWebWorker error:', e);
  }
  return false;
}

export const useUiDao = create((set) => ({
  // UI state
  uiState: {},
  setUiState: (uiState) => set({ uiState }),
  showUIControls: true,
  setShowUIControls: (showUIControls) => set({ showUIControls }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  showChart: false,
  setShowChart: (showChart) => set({ showChart }),
  showSpeedGauge: true,
  setShowSpeedGauge: (showSpeedGauge) => set({ showSpeedGauge }),
  detectStablePopulation: false,
  setDetectStablePopulation: (value) => set({ detectStablePopulation: !!value }),
  onClosePalette: () => set({ paletteOpen: false }),
  onPaletteSelect: (shape) => set({ selectedShape: shape }),
  onCloseCaptureDialog: () => {},
  setOnCloseCaptureDialog: (fn) => set({ onCloseCaptureDialog: typeof fn === 'function' ? fn : () => {} }),
  onSaveCapture: () => {},
  setOnSaveCapture: (fn) => set({ onSaveCapture: typeof fn === 'function' ? fn : () => {} }),
  onImportSuccess: () => {},
  setOnImportSuccess: (fn) => set({ onImportSuccess: typeof fn === 'function' ? fn : () => {} }),
  onCloseChart: () => set({ showChart: false }),
  optionsOpen: false,
  setOptionsOpen: (optionsOpen) => set({ optionsOpen }),
  setWasRunningBeforeOptions: (wasRunningBeforeOptions) => set({ wasRunningBeforeOptions }),
  scriptOpen: false,
  setScriptOpen: (scriptOpen) => set({ scriptOpen }),
  aboutOpen: false,
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  donateOpen: false,
  setDonateOpen: (donateOpen) => set({ donateOpen }),
  photoTestOpen: false,
  setPhotoTestOpen: (photoTestOpen) => set({ photoTestOpen }),
  userDialogOpen: false,
  setUserDialogOpen: (userDialogOpen) => set({ userDialogOpen }),
  showRegister: false,
  setShowRegister: (showRegister) => set({ showRegister }),
  confirmOnClear: true,
  setConfirmOnClear: (confirmOnClear) => set({ confirmOnClear }),

  // Viewport / rendering
  cellSize: 8,
  setCellSize: (cellSize) => set({ cellSize }),
  cursorCell: null,
  setCursorCell: (cursorCell) => set({ cursorCell }),
  scheduleCursorUpdate: () => {},
  setScheduleCursorUpdate: (fn) => set({ scheduleCursorUpdate: typeof fn === 'function' ? fn : () => {} }),

  // Worker preference (for scheduler)
  useWebWorker: getInitialUseWebWorker(),
  setUseWebWorker: (value) => {
    const boolValue = !!value;
    set({ useWebWorker: boolValue });
    try {
      globalThis?.localStorage?.setItem('useWebWorker', JSON.stringify(boolValue));
    } catch (e) {
      console.error('setUseWebWorker error:', e);
    }
  },

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

  // Color schemes
  colorScheme: colorSchemes.bio,
  colorSchemes,
  colorSchemeKey: 'bio',
  setColorSchemeKey: (key) => set({ colorSchemeKey: key || 'bio' }),
  setColorScheme: (colorScheme) => set({ colorScheme }),
  setColorSchemes: (schemes) => {
    const safe = schemes && typeof schemes === 'object' ? schemes : {};
    set({ colorSchemes: safe });
  },
}));
