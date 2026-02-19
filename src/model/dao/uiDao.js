// Direct global getter for ADA compliance (for model-layer enforcement)
// UI DAO: UI controls/dialogs

import { create } from 'zustand';
import { colorSchemes } from '../colorSchemes.js';

const ADA_SCHEME_KEY = 'adaSafe';
const DEFAULT_SCHEME_KEY = 'bio';

function resolveSchemeMap(schemes) {
  if (schemes && typeof schemes === 'object' && Object.keys(schemes).length > 0) {
    return schemes;
  }
  return colorSchemes;
}

function normalizeColorSchemeKey(requestedKey, adaEnabled, schemes) {
  if (adaEnabled) return ADA_SCHEME_KEY;
  const map = resolveSchemeMap(schemes);
  const candidate = (typeof requestedKey === 'string' && requestedKey.trim())
    ? requestedKey.trim()
    : DEFAULT_SCHEME_KEY;
  return Object.prototype.hasOwnProperty.call(map, candidate)
    ? candidate
    : DEFAULT_SCHEME_KEY;
}

function resolveColorSchemeValue(key, schemes) {
  const map = resolveSchemeMap(schemes);
  return map[key] || map[DEFAULT_SCHEME_KEY] || colorSchemes[DEFAULT_SCHEME_KEY];
}

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

function getInitialColorSchemeKey(adaEnabled) {
  if (adaEnabled) return ADA_SCHEME_KEY;
  try {
    const stored = globalThis?.localStorage?.getItem('colorSchemeKey');
    return normalizeColorSchemeKey(stored, false, colorSchemes);
  } catch (e) {
    console.error('getInitialColorSchemeKey error:', e);
  }
  return DEFAULT_SCHEME_KEY;
}

const initialEnableAdaCompliance = getInitialAdaCompliance();
const initialColorSchemeKey = getInitialColorSchemeKey(initialEnableAdaCompliance);
const initialColorScheme = resolveColorSchemeValue(initialColorSchemeKey, colorSchemes);

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
  assistantOpen: false,
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
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
  enableAdaCompliance: initialEnableAdaCompliance,
  setEnableAdaCompliance: (value) => {
    const boolValue = Boolean(value);
    set((state) => {
      const enforcedKey = normalizeColorSchemeKey(state.colorSchemeKey, boolValue, state.colorSchemes);
      return {
        enableAdaCompliance: boolValue,
        colorSchemeKey: enforcedKey,
        colorScheme: resolveColorSchemeValue(enforcedKey, state.colorSchemes)
      };
    });
    try {
      globalThis?.localStorage?.setItem('enableAdaCompliance', JSON.stringify(boolValue));
      if (boolValue) {
        globalThis?.localStorage?.setItem('colorSchemeKey', ADA_SCHEME_KEY);
      }
    } catch (e) {
      console.error('setEnableAdaCompliance error:', e);
    }
  },

  // Color schemes
  colorScheme: initialColorScheme,
  colorSchemes,
  colorSchemeKey: initialColorSchemeKey,
  setColorSchemeKey: (key) => set((state) => {
    const nextKey = normalizeColorSchemeKey(key, state.enableAdaCompliance, state.colorSchemes);
    return {
      colorSchemeKey: nextKey,
      colorScheme: resolveColorSchemeValue(nextKey, state.colorSchemes)
    };
  }),
  setColorScheme: (colorScheme) => set((state) => {
    if (state.enableAdaCompliance) {
      const enforcedKey = ADA_SCHEME_KEY;
      return {
        colorSchemeKey: enforcedKey,
        colorScheme: resolveColorSchemeValue(enforcedKey, state.colorSchemes)
      };
    }
    return { colorScheme };
  }),
  setColorSchemes: (schemes) => {
    const safe = resolveSchemeMap(schemes);
    set((state) => {
      const nextKey = normalizeColorSchemeKey(state.colorSchemeKey, state.enableAdaCompliance, safe);
      return {
        colorSchemes: safe,
        colorSchemeKey: nextKey,
        colorScheme: resolveColorSchemeValue(nextKey, safe)
      };
    });
  },
}));
