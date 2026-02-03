// Game DAO: core game logic/model state
import { create } from 'zustand';

function getStoredEngineMode() {
  try {
    const raw = globalThis?.localStorage?.getItem('engineMode');
    if (raw === 'hashlife') return 'hashlife';
    if (raw === 'normal') return 'normal';
  } catch (e) {
    console.error('[gameDao] read engineMode failed', e);
  }
  return 'normal';
}

function getStoredUseHashlife(defaultMode) {
  try {
    const raw = globalThis?.localStorage?.getItem('useHashlife');
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch (e) {
    console.error('[gameDao] read useHashlife failed', e);
  }
  return defaultMode === 'hashlife';
}

function getStoredGenerationBatchSize() {
  try {
    const raw = globalThis?.localStorage?.getItem('generationBatchSize');
    if (raw != null) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10000) return parsed;
    }
  } catch (e) {
    console.error('[gameDao] read generationBatchSize failed', e);
  }
  return 1;
}

const initialEngineMode = getStoredEngineMode();
const initialUseHashlife = getStoredUseHashlife(initialEngineMode);
const initialGenerationBatchSize = getStoredGenerationBatchSize();

export const useGameDao = create((set) => ({
  gameModel: null,
  setGameModel: (model) => set({ gameModel: model }),
  getLiveCells: () => new Map(),
  setGetLiveCells: (fn) => set({ getLiveCells: fn }),
  setCellAlive: (x, y, alive) => {
    console.log('[gameDao] setCellAlive called', { x, y, alive });
  },
  setSetCellAlive: (fn) => set({ setCellAlive: fn }),
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  engineMode: initialEngineMode,
  setEngineMode: (engineMode) => {
    const normalized = engineMode === 'hashlife' ? 'hashlife' : 'normal';
    try {
      globalThis?.localStorage?.setItem('engineMode', normalized);
      globalThis?.localStorage?.setItem('useHashlife', JSON.stringify(normalized === 'hashlife'));
    } catch (e) {
      console.error('[gameDao] persist engineMode failed', e);
    }
    set({
      engineMode: normalized,
      isHashlifeMode: normalized === 'hashlife',
      useHashlife: normalized === 'hashlife'
    });
  },
  isHashlifeMode: initialUseHashlife,
  setIsHashlifeMode: (isHashlifeMode) => set({
    isHashlifeMode: Boolean(isHashlifeMode),
    engineMode: isHashlifeMode ? 'hashlife' : 'normal',
    useHashlife: Boolean(isHashlifeMode)
  }),
  useHashlife: initialUseHashlife,
  setUseHashlife: (useHashlife) => set((state) => ({
    useHashlife: Boolean(useHashlife),
    isHashlifeMode: Boolean(useHashlife),
    engineMode: useHashlife ? 'hashlife' : (state.engineMode === 'hashlife' ? 'normal' : state.engineMode)
  })),
  generationBatchSize: initialGenerationBatchSize,
  setGenerationBatchSize: (generationBatchSize) => {
    set({ generationBatchSize });
    try {
      globalThis?.localStorage?.setItem('generationBatchSize', generationBatchSize.toString());
    } catch (e) {
      console.error('[gameDao] persist generationBatchSize failed', e);
    }
  },
  onStartNormalMode: () => {},
  setOnStartNormalMode: (fn) => set({ onStartNormalMode: typeof fn === 'function' ? fn : () => {} }),
  onStartHashlifeMode: () => {},
  setOnStartHashlifeMode: (fn) => set({ onStartHashlifeMode: typeof fn === 'function' ? fn : () => {} }),
  onStopAllEngines: () => {},
  setOnStopAllEngines: (fn) => set({ onStopAllEngines: typeof fn === 'function' ? fn : () => {} }),
  onSetEngineMode: () => {},
  setOnSetEngineMode: (fn) => set({ onSetEngineMode: typeof fn === 'function' ? fn : () => {} }),
  onSetGenerationBatchSize: () => {},
  setOnSetGenerationBatchSize: (fn) => set({ onSetGenerationBatchSize: typeof fn === 'function' ? fn : () => {} }),
  steadyInfo: { steady: false, period: 0, popChanging: false },
  setSteadyInfo: (info) => set({ steadyInfo: info }),
}));
