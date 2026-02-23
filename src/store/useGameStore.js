
import { create } from 'zustand';

export const useGameStore = create((set) => ({

  // Core game state
  gameModel: null,
  setGameModel: (model) => set({ gameModel: model }),

  // Tool state
  selectedTool: 'draw',
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  toolState: {},
  setToolState: (toolState) => set({ toolState }),


  // UI state (example)
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  showSpeedGauge: true,
  setShowSpeedGauge: (show) => set({ showSpeedGauge: show }),

  // UI/dialog state additions
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  showUIControls: true,
  setShowUIControls: (showUIControls) => set({ showUIControls }),
  popWindowSize: 30,
  setPopWindowSize: (popWindowSize) => set({ popWindowSize }),
  generation: 0,
  setGeneration: (generation) => set({ generation }),
  selectedShape: null,
  setSelectedShape: (selectedShape) => set({ selectedShape }),
  captureDialogOpen: false,
  setCaptureDialogOpen: (captureDialogOpen) => set({ captureDialogOpen }),
  myShapesDialogOpen: false,
  setMyShapesDialogOpen: (myShapesDialogOpen) => set({ myShapesDialogOpen }),
  importDialogOpen: false,
  setImportDialogOpen: (importDialogOpen) => set({ importDialogOpen }),
  captureData: null,
  setCaptureData: (captureData) => set({ captureData }),

  // Additional UI/dialog/global state
  randomRectPercent: 50,
  setRandomRectPercent: (randomRectPercent) => set({ randomRectPercent }),
  detectStablePopulation: true,
  setDetectStablePopulation: (detectStablePopulation) => set({ detectStablePopulation }),
  popTolerance: 3,
  setPopTolerance: (popTolerance) => set({ popTolerance }),
  steadyInfo: null,
  setSteadyInfo: (steadyInfo) => set({ steadyInfo }),
  memoryTelemetryEnabled: false,
  setMemoryTelemetryEnabled: (memoryTelemetryEnabled) => set({ memoryTelemetryEnabled }),
  maxChartGenerations: 5000,
  setMaxChartGenerations: (maxChartGenerations) => set({ maxChartGenerations }),
  populationHistory: [],
  setPopulationHistory: (populationHistory) => set({ populationHistory }),
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
  stableDetectionInfo: null,
  setStableDetectionInfo: (stableDetectionInfo) => set({ stableDetectionInfo }),
  showStableDialog: false,
  setShowStableDialog: (showStableDialog) => set({ showStableDialog }),
  showFirstLoadWarning: true,
  setShowFirstLoadWarning: (showFirstLoadWarning) => set({ showFirstLoadWarning }),

  // Zustand migration additions:
  performanceCaps: {
    maxFPS: 60,
    maxGPS: 30,
    enableFPSCap: false,
    enableGPSCap: false,
  },
  setPerformanceCaps: (updater) =>
    set((state) => {
      const prev = state.performanceCaps;
      // Support both function and object for updater
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { performanceCaps: { ...prev, ...next } };
    }),
  colorScheme: null,
  setColorScheme: (colorScheme) => set({ colorScheme }),
  cellSize: 8,
  setCellSize: (cellSize) => set({ cellSize }),
  toolMap: {},
  setToolMap: (toolMap) => set({ toolMap }),
  toolStateRef: { current: {} },
  setToolStateRef: (ref) => set({ toolStateRef: ref }),
  getLiveCells: () => new Map(),
  setGetLiveCells: (fn) => set({ getLiveCells: fn }),
  setCellAlive: () => {},
  setSetCellAlive: (fn) => set({ setCellAlive: fn }),
  scheduleCursorUpdate: () => {},
  setScheduleCursorUpdate: (fn) => set({ scheduleCursorUpdate: fn }),
  placeShape: () => {},
  setPlaceShape: (fn) => set({ placeShape: fn }),
  logger: console,
  setLogger: (logger) => set({ logger }),
  // Shared cursor position for global access
  cursorCell: null,
  setCursorCell: (cursorCell) => set({ cursorCell }),

  // Centralized UI/dialog state
  scriptOpen: false,
  setScriptOpen: (scriptOpen) => set({ scriptOpen }),
  optionsOpen: false,
  setOptionsOpen: (optionsOpen) => set({ optionsOpen }),
  wasRunningBeforeOptions: false,
  setWasRunningBeforeOptions: (wasRunningBeforeOptions) => set({ wasRunningBeforeOptions }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  aboutOpen: false,
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  supportOpen: false,
  setSupportOpen: (supportOpen) => set({ supportOpen }),
  photoTestOpen: false,
  setPhotoTestOpen: (photoTestOpen) => set({ photoTestOpen }),
  userDialogOpen: false,
  setUserDialogOpen: (userDialogOpen) => set({ userDialogOpen }),
  showRegister: false,
  setShowRegister: (showRegister) => set({ showRegister }),
  showChart: false,
  setShowChart: (showChart) => set({ showChart }),
  confirmOnClear: true,
  setConfirmOnClear: (confirmOnClear) => set({ confirmOnClear }),
}));

