import useMediaQuery from '@mui/material/useMediaQuery';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useShapeManager } from './useShapeManager.js';
import useGridMousePosition from './useGridMousePosition.js';
import useInitialShapeLoader from '../../hooks/useInitialShapeLoader.js';
import { loadGridIntoGame, rotateAndApply } from '../utils/gameUtils.js';
import { colorSchemes } from '../../model/colorSchemes.js';
import { saveCapturedShapeToBackend, getBackendApiBase } from '../../utils/backendApi.js';
import useProtectedAction from '../../auth/useProtectedAction.js';
import { useToolState } from './useToolState.js';
import { useToolDao } from '../../model/dao/toolDao.js';
import { useGameState, useGameDao } from './useGameState.js';
import { usePopulationState } from './usePopulationState.js';
import { useUiState, useUiDao } from './useUiState.js';
import { usePerformanceState } from './usePerformanceState.js';
import { useDialogState } from './useDialogState.js';
import { GameMVC } from '../../controller/GameMVC.js';
import { setupGameDaoFromMVC } from '../../controller/setupGameDao.js';
import { setupToolDaoFromMVC } from '../../controller/setupToolDao.js';
import { startMemoryLogger } from '../../utils/memoryLogger.js';
import { computePopulationChange } from '../../utils/stabilityMetrics.js';
import hashlifeAdapter from '../../model/hashlife/adapter.js';
import { eventToCellFromCanvas } from '../../controller/utils/canvasUtils.js';

// Utility: getColorSchemeFromKey
function getColorSchemeFromKey(key) {
  const base = colorSchemes[key] || {};
  const copy = { ...base };
  if (typeof Object.freeze === 'function') Object.freeze(copy);
  return copy;
}

const INITIAL_STEADY_INFO = Object.freeze({ steady: false, period: 0, popChanging: false });
const GENERATION_ZERO_STORAGE_KEY = 'gol.generationZeroPattern.v1';

export function useGameOfLifeAppRuntime() {
  // Declare gameRef before any use
  const gameRef = React.useRef(null);
  // selectedTool is now derived from the model/controller, not local state.
  const [selectedTool, setSelectedTool] = React.useState('draw');
  React.useEffect(() => {
    // Subscribe to model/controller tool changes
    const handler = (event, data) => {
      if (event === 'selectedToolChanged') {
        setSelectedTool(data);
      }
    };
    if (gameRef.current && typeof gameRef.current.onModelChange === 'function') {
      gameRef.current.onModelChange(handler);
    }
    // Set initial tool from model
    if (gameRef.current && gameRef.current.model && typeof gameRef.current.model.getSelectedTool === 'function') {
      setSelectedTool(gameRef.current.model.getSelectedTool());
    }
    return () => {
      if (gameRef.current && typeof gameRef.current.offModelChange === 'function') {
        gameRef.current.offModelChange(handler);
      }
    };
  }, [gameRef]);
  // ...all destructuring and hook calls...
  const {
    toolState, setToolState, selectedShape, setSelectedShape, randomRectPercent, setRandomRectPercent
  } = useToolState();
  const {
    isRunning, setIsRunning, engineMode, setEngineMode, isHashlifeMode, setIsHashlifeMode, useHashlife, setUseHashlife, generationBatchSize, setGenerationBatchSize, steadyInfo, setSteadyInfo
  } = useGameState();
  const {
    populationHistory, setPopulationHistory, popWindowSize, setPopWindowSize, popTolerance, setPopTolerance, generation, setGeneration, maxChartGenerations, setMaxChartGenerations, stableDetectionInfo, setStableDetectionInfo
  } = usePopulationState();
  const {
    paletteOpen, setPaletteOpen, setShowChart, showUIControls, setShowUIControls
  } = useUiState();
  const onCloseCaptureDialog = useUiDao(state => state.onCloseCaptureDialog);
  const setOnCloseCaptureDialog = useUiDao(state => state.setOnCloseCaptureDialog);
  const onSaveCapture = useUiDao(state => state.onSaveCapture);
  const setOnSaveCapture = useUiDao(state => state.setOnSaveCapture);
  const onImportSuccess = useUiDao(state => state.onImportSuccess);
  const setOnImportSuccess = useUiDao(state => state.setOnImportSuccess);
  const {
    performanceCaps, setPerformanceCaps, memoryTelemetryEnabled, setMemoryTelemetryEnabled
  } = usePerformanceState();
  const {
    captureDialogOpen, setCaptureDialogOpen, captureData, setCaptureData, myShapesDialogOpen, setMyShapesDialogOpen, importDialogOpen, setImportDialogOpen,
    showStableDialog, setShowStableDialog, showFirstLoadWarning, setShowFirstLoadWarning,
    shapesNotifOpen, setShapesNotifOpen, loginNotifOpen, setLoginNotifOpen, loginNotifMessage, setLoginNotifMessage,
    showDuplicateDialog, setShowDuplicateDialog, duplicateShape, setDuplicateShape
  } = useDialogState();
  // ...all refs, useState, useUiDao, etc...

  // UI state from uiDao (must be after all other destructuring, before debug logs)
  const enableAdaCompliance = useUiDao(state => state.enableAdaCompliance);
  const setEnableAdaCompliance = useUiDao(state => state.setEnableAdaCompliance);
  const setColorSchemesDao = useUiDao(state => state.setColorSchemes);
  const setColorSchemeDao = useUiDao(state => state.setColorScheme);
  const colorSchemeKeyDao = useUiDao(state => state.colorSchemeKey);
  const optionsOpenDao = useUiDao(state => state.optionsOpen);

  React.useEffect(() => {
    setOnCloseCaptureDialog(() => () => setCaptureDialogOpen(false));
  }, [setOnCloseCaptureDialog, setCaptureDialogOpen]);

  // Now, after ALL destructuring/hooks/refs, place your debug logs:
  React.useEffect(() => {
    // Keep the DAO in sync so canvas manager and overlays use the actual tool
    try { useToolDao.getState().setSelectedTool(selectedTool || 'draw'); } catch (e) { console.error(e); }
  }, [selectedTool]);

  // Refs and constants (must come after useState, before effects/callbacks)
  const userNotifiedRef = useRef(false);
  const isRunningRef = useRef(false);
  const snapshotsRef = useRef([]);
  const optionsOpenPrevRef = useRef(false);
  const wasRunningBeforeOptionsRef = useRef(false);
  // (removed duplicate declaration of gameRef)
  const pendingLoadRef = useRef(null);
  // Ensure toolStateRef is always defined and never undefined
  const toolStateRef = React.useRef({});
  // Defensive: if toolStateRef is ever undefined, re-initialize
  if (!toolStateRef.current) toolStateRef.current = {};
  // Publish toolStateRef after render commit to avoid setState-in-render warnings
  React.useEffect(() => {
    try { useToolDao.getState().setToolStateRef(toolStateRef); } catch (e) { console.error(e); }
  }, [toolStateRef]);
  const popHistoryRef = useRef([]);
  const canvasRef = useRef(null);

  // Viewport state (restored for build)
  const [viewportSnapshot, setViewportSnapshot] = React.useState({
    offsetX: 0,
    offsetY: 0,
    cellSize: 8,
    zoom: 1
  });

  // Hashlife config (restored for build)
  const hashlifeMaxRun = 1000; // Adjust to previous working value if needed
  const hashlifeCacheSize = 1024; // Adjust to previous working value if needed
  const clearHashlifeCache = useCallback(() => { /* implement cache clearing logic if needed */ }, []);

  // Callbacks (after refs, before effects)
  
  
  const detectStablePopulation = useUiDao(state => state.detectStablePopulation);
  const setDetectStablePopulation = useUiDao(state => state.setDetectStablePopulation);
  const useWebWorker = useUiDao(state => state.useWebWorker);
  const setUseWebWorker = useUiDao(state => state.setUseWebWorker);
  const setUseWebWorkerPreference = useCallback((value) => {
    setUseWebWorker(value);
    try { globalThis.localStorage?.setItem('useWebWorker', JSON.stringify(value)); } catch (e) { console.error(e); }
  }, [setUseWebWorker]);
 
  const setRunningState = useCallback((running) => {
    if (running && enableAdaCompliance) {
      // Angular parity: ADA mode blocks autoplay/start and keeps simulation paused.
      setIsRunning(false);
      isRunningRef.current = false;
      try { gameRef.current?.controller?.handleRunningStateChange?.(false); } catch (e) { console.error(e); }
      try { gameRef.current?.model?.setRunningModel?.(false); } catch (e) { console.error(e); }
      return;
    }
    const modelIsRunning = !!running;
    setIsRunning(modelIsRunning);
    isRunningRef.current = modelIsRunning;
    try {
      // Drive controller scheduler so the run loop actually starts/stops
      if (gameRef.current?.controller?.handleRunningStateChange) {
        gameRef.current.controller.handleRunningStateChange(modelIsRunning);
      } else if (modelIsRunning && gameRef.current?.controller?.startGame) {
        gameRef.current.controller.startGame();
      } else if (!modelIsRunning && gameRef.current?.controller?.stopGame) {
        gameRef.current.controller.stopGame();
      }
    } catch (e) {
      console.error('Failed to update controller running state:', e);
    }
    if (gameRef.current?.model?.setRunningModel) {
      try { gameRef.current.model.setRunningModel(modelIsRunning); } catch (e) { console.error(e); }
    }
  }, [setIsRunning, gameRef, enableAdaCompliance]);

  const setIsRunningCombined = useCallback((running, mode = engineMode) => {
    if (running && mode !== engineMode) {
      setEngineMode(mode);
    }
    setRunningState(running);
  }, [setRunningState, engineMode, setEngineMode]);

  // Pause simulation whenever capture dialog opens
  useEffect(() => {
    if (captureDialogOpen) {
      setIsRunningCombined(false);
    }
  }, [captureDialogOpen, setIsRunningCombined]);

  // Ensure the controller/game model observes the latest running flag even if
  // the toggle happened before MVC initialization (prevents a stuck run/pause UI).
  useEffect(() => {
    const mvc = gameRef.current;
    if (!mvc?.controller || !mvc?.model) return;
    try {
      mvc.controller.handleRunningStateChange?.(isRunning);
    } catch (e) {
      console.error('Failed to sync running state to controller:', e);
    }
    try {
      mvc.model.setRunningModel?.(isRunning);
    } catch (e) {
      console.error('Failed to sync running state to model:', e);
    }
  }, [isRunning, gameRef]);

  // Pause simulation whenever OptionsPanel opens; resume only if it was running before.
  useEffect(() => {
    const nowOpen = !!optionsOpenDao;
    const wasOpen = optionsOpenPrevRef.current;
    if (nowOpen && !wasOpen) {
      wasRunningBeforeOptionsRef.current = !!isRunningRef.current;
      if (isRunningRef.current) {
        setRunningState(false);
      }
    } else if (!nowOpen && wasOpen) {
      if (wasRunningBeforeOptionsRef.current) {
        setRunningState(true);
      }
      wasRunningBeforeOptionsRef.current = false;
    }
    optionsOpenPrevRef.current = nowOpen;
  }, [optionsOpenDao, setRunningState]);

  // Effects (after all refs and callbacks)
  
  // Save generation batch size to localStorage
  useEffect(() => {
    try {
      globalThis.localStorage.setItem('generationBatchSize', generationBatchSize.toString());
    } catch (e) {
      console.error(e);
    }
  }, [generationBatchSize, gameRef]);
  useEffect(() => {
    popHistoryRef.current = populationHistory;
  }, [populationHistory]);
  const isSmall = useMediaQuery('(max-width:900px)');
  const getViewport = useCallback(() => (
    gameRef.current?.getViewport?.() ?? { offsetX: 0, offsetY: 0 }
  ), [gameRef]);
  const initialViewport = React.useMemo(() => getViewport(), [getViewport]);
  // Use previous cellSize or fallback to 8 if undefined
  const cellSize = viewportSnapshot.cellSize || 8;
  // getLiveCells now comes from gameDao
  const setCellAlive = useCallback((x, y, alive) => {
    gameRef.current?.setCellAlive?.(x, y, alive);
  }, [gameRef]);
  // drawWithOverlay delegates to the GameMVC controller to request a render
  const drawWithOverlay = useCallback(() => {
    try {
      gameRef.current?.controller?.requestRender?.();
    } catch (e) {
      // Log render errors instead of silently ignoring them so issues are visible.
       
      console.error('drawWithOverlay error:', e);
    }
  }, [gameRef]);

  // Canvas DOM ref (used by GameUILayout). The single renderer (GameMVC)
  // will be instantiated when this ref's element is available.
  
  // Engine switching functions
  const startNormalMode = useCallback(() => {
    setEngineMode('normal');
    setUseHashlife(false);
    setIsHashlifeMode(false);
    if (gameRef.current?.model?.setEngineMode) {
      gameRef.current.model.setEngineMode('normal');
    }
    setIsRunningCombined(true, 'normal');
  }, [gameRef, setEngineMode, setIsHashlifeMode, setIsRunningCombined, setUseHashlife]);
  
  const startHashlifeMode = useCallback(() => {
    setEngineMode('hashlife');
    setUseHashlife(true);
    setIsHashlifeMode(true);
    if (gameRef.current?.model?.setEngineMode) {
      gameRef.current.model.setEngineMode('hashlife');
    }
    setIsRunningCombined(true, 'hashlife');
  }, [gameRef, setEngineMode, setIsHashlifeMode, setIsRunningCombined, setUseHashlife]);
  
  const stopAllEngines = useCallback(() => {
    setIsRunningCombined(false);
  }, [setIsRunningCombined]);

  // Simple engine mode setter for dropdown
  const setEngineModeDirect = useCallback((mode) => {
    const nextMode = mode === 'hashlife' ? 'hashlife' : 'normal';
    setEngineMode(nextMode);
    setUseHashlife(nextMode === 'hashlife');
    setIsHashlifeMode(nextMode === 'hashlife');
    if (gameRef.current?.model?.setEngineMode) {
      try {
        gameRef.current.model.setEngineMode(nextMode);
      } catch (e) {
        console.error('Failed to set engine mode on model:', e);
      }
    }
  }, [gameRef, setEngineMode, setIsHashlifeMode, setUseHashlife]);

  // Sync generation batch size with GameModel
  useEffect(() => {
    if (gameRef.current?.model?.setGenerationBatchSize) {
      gameRef.current.model.setGenerationBatchSize(generationBatchSize);
    }
  }, [generationBatchSize]);

  // Publish engine handlers into gameDao so HeaderBar/ControlsBar receive live callbacks
  useEffect(() => {
    try {
      useGameDao.getState().setOnStartNormalMode(startNormalMode);
      useGameDao.getState().setOnStartHashlifeMode(startHashlifeMode);
      useGameDao.getState().setOnStopAllEngines(stopAllEngines);
      useGameDao.getState().setOnSetEngineMode(setEngineModeDirect);
      useGameDao.getState().setOnSetGenerationBatchSize(setGenerationBatchSize);
    } catch (e) {
      console.error('[useGameOfLifeAppRuntime] failed to publish engine handlers', e);
    }
  }, [startNormalMode, startHashlifeMode, stopAllEngines, setEngineModeDirect, setGenerationBatchSize]);

  // React-side reset when session is cleared
  useEffect(() => {
    const handleSessionCleared = () => {
      setPopulationHistory([]);
      popHistoryRef.current = [];
      setSteadyInfo(INITIAL_STEADY_INFO);
    };

    if (typeof globalThis !== 'undefined' && globalThis.addEventListener) {
      globalThis.addEventListener('gol:sessionCleared', handleSessionCleared);
    }

    return () => {
      if (typeof globalThis !== 'undefined' && globalThis.removeEventListener) {
        globalThis.removeEventListener('gol:sessionCleared', handleSessionCleared);
      }
    };
  }, [setPopulationHistory, setSteadyInfo]);

  useEffect(() => {
    if (generation !== 0) return;
    try {
      const model = gameRef.current?.model;
      if (!model || typeof model.getGeneration !== 'function' || typeof model.getLiveCells !== 'function') {
        return;
      }
      if (Number(model.getGeneration()) !== 0) return;

      const cells = Array.from(model.getLiveCells().keys())
        .map((key) => {
          const [x, y] = String(key).split(',').map(Number);
          return { x, y };
        })
        .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y));

      globalThis.localStorage?.setItem(
        GENERATION_ZERO_STORAGE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          cells
        })
      );
    } catch (error) {
      console.error('[useGameOfLifeAppRuntime] Failed to snapshot generation-zero pattern:', error);
    }
  }, [generation, gameRef]);

  useEffect(() => {
    // Hashlife progress updates are disabled; we only use final results
    // from GameModel._stepHashlife() so intermediate generations are not
    // applied to the model.
    if (!gameRef.current?.setPerformanceSettings) return;
    try {
      gameRef.current.setPerformanceSettings({
        populationWindowSize: popWindowSize,
        populationTolerance: popTolerance
      });
    } catch (err) {
       
      console.error('Failed to sync stability settings with GameMVC:', err);
    }
  }, [popWindowSize, popTolerance, gameRef]);

  useEffect(() => {
    if (!gameRef.current?.setPerformanceSettings) return;
    try {
      gameRef.current.setPerformanceSettings({
        useWebWorker: useWebWorker,
      });
    } catch (err) {
       
      console.error('Failed to sync useWebWorker settings with GameMVC:', err);
    }
  }, [useWebWorker, gameRef]);

  // Sync FPS/GPS performance caps to the controller
  useEffect(() => {
    if (!gameRef.current?.setPerformanceSettings) return;
    try {
      gameRef.current.setPerformanceSettings({
        maxFPS: performanceCaps.maxFPS,
        maxGPS: performanceCaps.maxGPS,
        enableFPSCap: performanceCaps.enableFPSCap,
        enableGPSCap: performanceCaps.enableGPSCap
      });
    } catch (err) {
       
      console.error('Failed to sync performance caps with GameMVC:', err);
    }
  }, [performanceCaps.maxFPS, performanceCaps.maxGPS, performanceCaps.enableFPSCap, performanceCaps.enableGPSCap]);




  const setShowSpeedGauge = useUiDao(state => state.setShowSpeedGauge);

  const setDetectStablePopulationPreference = useCallback((value) => {
    setDetectStablePopulation(value);
    try { globalThis.localStorage?.setItem('detectStablePopulation', JSON.stringify(value)); } catch (e) { console.error(e); }
  }, [setDetectStablePopulation]);

  const setColorSchemeKey = useUiDao(state => state.setColorSchemeKey);

  const setMaxFPS = useCallback((value) => {
    const clamped = Math.max(1, Math.min(120, Number(value) || 60));
    setPerformanceCaps((prevCaps) => ({ ...prevCaps, maxFPS: clamped }));
  }, [setPerformanceCaps]);

  const setMaxGPS = useCallback((value) => {
    const clamped = Math.max(1, Math.min(60, Number(value) || 30));
    setPerformanceCaps((prevCaps) => ({ ...prevCaps, maxGPS: clamped }));
  }, [setPerformanceCaps]);

  const setEnableFPSCap = useCallback((value) => {
    setPerformanceCaps((prev) => {
      const next = { ...prev, enableFPSCap: value };
      try { globalThis.localStorage?.setItem('enableFPSCap', JSON.stringify(value)); } catch (e) { console.error(e); }
      return next; // Return updated performance caps
    });
  }, [setPerformanceCaps]);

  const setEnableGPSCap = useCallback((value) => {
    setPerformanceCaps((prev) => {
      const next = { ...prev, enableGPSCap: value };
      try { globalThis.localStorage?.setItem('enableGPSCap', JSON.stringify(value)); } catch (e) { console.error(e); }
      return next; // Return updated performance caps
    });
  }, [setPerformanceCaps]);

  const readPreferredPerformanceCaps = useCallback(() => {
    let prefMaxFPS = 60;
    let prefMaxGPS = 30;
    let prefEnableFPSCap = false;
    let prefEnableGPSCap = false;

    try {
      const preferredFPSRaw = globalThis.localStorage?.getItem('preferredMaxFPS');
      const preferredGPSRaw = globalThis.localStorage?.getItem('preferredMaxGPS');
      const preferredEnableFPSRaw = globalThis.localStorage?.getItem('preferredEnableFPSCap');
      const preferredEnableGPSRaw = globalThis.localStorage?.getItem('preferredEnableGPSCap');
      const fallbackFPSRaw = globalThis.localStorage?.getItem('maxFPS');
      const fallbackGPSRaw = globalThis.localStorage?.getItem('maxGPS');
      const fallbackEnableFPSRaw = globalThis.localStorage?.getItem('enableFPSCap');
      const fallbackEnableGPSRaw = globalThis.localStorage?.getItem('enableGPSCap');
      const parsedFPS = Number.parseInt(preferredFPSRaw ?? fallbackFPSRaw, 10);
      const parsedGPS = Number.parseInt(preferredGPSRaw ?? fallbackGPSRaw, 10);

      if (Number.isFinite(parsedFPS) && parsedFPS > 0) prefMaxFPS = Math.max(1, Math.min(120, parsedFPS));
      if (Number.isFinite(parsedGPS) && parsedGPS > 0) prefMaxGPS = Math.max(1, Math.min(60, parsedGPS));
      if (preferredEnableFPSRaw ?? fallbackEnableFPSRaw) {
        prefEnableFPSCap = JSON.parse(preferredEnableFPSRaw ?? fallbackEnableFPSRaw);
      }
      if (preferredEnableGPSRaw ?? fallbackEnableGPSRaw) {
        prefEnableGPSCap = JSON.parse(preferredEnableGPSRaw ?? fallbackEnableGPSRaw);
      }
    } catch (e) { console.error(e); }

    return {
      maxFPS: prefMaxFPS,
      maxGPS: prefMaxGPS,
      enableFPSCap: prefEnableFPSCap,
      enableGPSCap: prefEnableGPSCap
    };
  }, []);

  const applyAdaPolicy = useCallback((enabled, options = {}) => {
    const newValue = Boolean(enabled);
    const broadcast = options.broadcast !== false;
    const source = options.source || 'runtime';
    const preferred = readPreferredPerformanceCaps();
    const newColorScheme = newValue ? 'adaSafe' : 'bio';
    const computedCaps = {
      maxFPS: newValue ? 2 : preferred.maxFPS,
      maxGPS: newValue ? 2 : preferred.maxGPS,
      enableFPSCap: newValue ? true : preferred.enableFPSCap,
      enableGPSCap: newValue ? true : preferred.enableGPSCap
    };

    setEnableAdaCompliance(newValue);
    if (newValue) {
      setRunningState(false);
    }
    setColorSchemeKey(newColorScheme);
    setPerformanceCaps(() => computedCaps);

    try {
      globalThis.localStorage?.setItem('enableAdaCompliance', JSON.stringify(newValue));
      globalThis.localStorage?.setItem('colorSchemeKey', newColorScheme);
      globalThis.localStorage?.setItem('maxFPS', String(computedCaps.maxFPS));
      globalThis.localStorage?.setItem('maxGPS', String(computedCaps.maxGPS));
      globalThis.localStorage?.setItem('enableFPSCap', JSON.stringify(computedCaps.enableFPSCap));
      globalThis.localStorage?.setItem('enableGPSCap', JSON.stringify(computedCaps.enableGPSCap));
    } catch (e) { console.error(e); }

    if (broadcast) {
      try {
        const detail = {
          enabled: newValue,
          colorScheme: newColorScheme,
          performanceCaps: computedCaps,
          source
        };
        globalThis.dispatchEvent(new CustomEvent('gol:adaChanged', { detail }));
        globalThis.dispatchEvent(new CustomEvent('gol:adaPolicyReset', { detail }));
      } catch (e) { console.error(e); }
    }

    // Trigger canvas resize to apply layout updates after ADA toggle
    try {
      const canvas = canvasRef?.current;
      if (!canvas) return;
      globalThis.dispatchEvent(new Event('resize', { bubbles: true }));
      const schedule = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (fn) => setTimeout(fn, 0);
      schedule(() => {
        if (gameRef?.current?.renderer?.resize) {
          try {
            const rect = canvas.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              gameRef.current.renderer.resize(Math.floor(rect.width), Math.floor(rect.height));
            }
          } catch (e) { console.error(e); }
        }
      });
    } catch (e) { console.error(e); }
  }, [canvasRef, gameRef, readPreferredPerformanceCaps, setColorSchemeKey, setEnableAdaCompliance, setPerformanceCaps, setRunningState]);

  const setEnableAdaComplianceWithUpdate = useCallback((value) => {
    applyAdaPolicy(Boolean(value), { broadcast: true, source: 'runtime' });
  }, [applyAdaPolicy]);

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.addEventListener) return undefined;
    const handleAdaEvent = (event) => {
      const detail = event?.detail || {};
      if (detail.source === 'runtime') return;
      if (typeof detail.enabled === 'undefined') return;
      applyAdaPolicy(Boolean(detail.enabled), { broadcast: false, source: detail.source || 'event' });
    };
    globalThis.addEventListener('gol:adaChanged', handleAdaEvent);
    globalThis.addEventListener('gol:adaPolicyReset', handleAdaEvent);
    return () => {
      globalThis.removeEventListener('gol:adaChanged', handleAdaEvent);
      globalThis.removeEventListener('gol:adaPolicyReset', handleAdaEvent);
    };
  }, [applyAdaPolicy]);

  // Seed DAO color schemes once so OptionsPanel has entries to render.
  useEffect(() => {
    setColorSchemesDao(colorSchemes);
    // If the stored key is invalid, fall back to a known scheme.
    if (!colorSchemes[colorSchemeKeyDao]) {
      const fallback = colorSchemes.bio ? 'bio' : Object.keys(colorSchemes)[0];
      if (fallback) setColorSchemeKey(fallback);
    }
  }, [setColorSchemesDao, setColorSchemeKey, colorSchemeKeyDao]);

  useEffect(() => {
    try {
      const scheme = getColorSchemeFromKey(colorSchemeKeyDao || 'bio');
      setColorSchemeDao(scheme);
    } catch (e) {
      console.error('Failed to set color scheme in uiDao:', e);
    }
  }, [colorSchemeKeyDao, setColorSchemeDao]);

  // Push updated color scheme into the MVC/renderer whenever the key changes.
  useEffect(() => {
    const mvc = gameRef.current;
    if (!mvc) return undefined;
    const applyScheme = () => {
      try {
        const scheme = getColorSchemeFromKey(colorSchemeKeyDao || 'bio');
        mvc.setColorScheme?.(scheme);
        mvc.controller?.requestRender?.();
      } catch (e) {
        console.error('Failed to apply color scheme to MVC:', e);
      }
    };

    applyScheme();
    return undefined;
  }, [colorSchemeKeyDao, gameRef]);



  // setMyShapesDialogOpen and setImportDialogOpen are now provided by Zustand



  // Sync random rectangle percent into controller tool state as a probability (0..1)
  useEffect(() => {
    const applyProb = () => {
      try {
        const n = Number(randomRectPercent);
        const p = Number.isFinite(n) ? Math.max(0, Math.min(1, n / 100)) : 0;
        const ctrl = gameRef.current?.controller;
        if (ctrl && typeof ctrl._setToolState === 'function') {
          ctrl._setToolState({ prob: p });
        }
      } catch (e) {
        // swallow
      }
    };

    if (gameRef.current?.controller && typeof gameRef.current.controller._setToolState === 'function') {
      applyProb();
      return undefined;
    }

    const timer = setTimeout(applyProb, 0);
    return () => clearTimeout(timer);
  }, [randomRectPercent]);

  useEffect(() => {
    if (!detectStablePopulation) {
      setSteadyInfo((prev) => (prev === INITIAL_STEADY_INFO ? prev : INITIAL_STEADY_INFO));
      // Clear any existing dialog state when detection is disabled
      setShowStableDialog(false);
      setStableDetectionInfo(null);
      userNotifiedRef.current = false;
      return;
    }
    const mvc = gameRef.current;
    if (!mvc || typeof mvc.isStable !== 'function') return;

    const checkStability = () => {
      let steady = false;
      let period = 0;
      const generation = mvc.model?.getGeneration?.() || 0;
      try {
        const modelPopHistory = mvc.model?.populationHistory || [];
        
        steady = !!mvc.isStable(popWindowSize, popTolerance);
        
        if (steady && typeof mvc.detectPeriod === 'function') {
          period = mvc.detectPeriod(Math.min(popWindowSize, 120)) || 0;
        }
        
        // Log only first detection and major milestones
        const firstDetection = steady && !steadyInfo?.steady;
        if (firstDetection) {
          // Stability detected log removed
          
            // Only pause automatically for non-empty or progressed simulations.
            // Avoid auto-pausing an empty world right after the user starts it.
            // Only auto-pause if the simulation has advanced at least one generation.
            // This prevents pausing immediately when the user starts a pre-existing still life.
            if (generation > 0) {
              setIsRunningCombined(false);
            } else {
              try { console.debug('[GameOfLifeApp] stability detected before any generations advanced; skipping auto-pause'); } catch (e) { console.error(e); }
            }
        } else if (!steady && modelPopHistory.length % 100 === 0) {
          // Still evolving log removed
        }
      } catch (err) {
         
        console.error('Failed to evaluate steady state:', err);
        steady = false;
        period = 0;
      }

      // Convert GameModel's populationHistory (numbers) for computePopulationChange
      const modelPopHistory = mvc.model?.populationHistory || [];
      const { popChanging } = computePopulationChange(modelPopHistory, popWindowSize, popTolerance);
      const nextInfo = { steady, period, popChanging };
      
      // Check if we just detected stability for the first time
      const wasStable = steadyInfo.steady;
      const nowStable = nextInfo.steady;
      
      // Handle dialog display outside of setSteadyInfo to avoid state update complications
      if (nowStable && detectStablePopulation && !userNotifiedRef.current) {
        const populationCount = modelPopHistory[modelPopHistory.length - 1] || 0;
        // Only show stable dialog for patterns after at least one generation and non-empty
        if (populationCount === 0 || generation === 0) {
          try { console.debug('[GameOfLifeApp] stable detected but either empty or no generations yet; skipping dialog'); } catch (e) { console.error(e); }
        } else {
        const patternType = period === 0 ? 'Still Life' : period === 1 ? 'Still Life' : `Period ${period} Oscillator`;
        
          setStableDetectionInfo({
            generation,
            populationCount,
            patternType,
            period
          });
          setShowStableDialog(true);
          userNotifiedRef.current = true;
        }
      }
      
      // Reset notification flag if pattern becomes unstable
      if (!nowStable && wasStable) {
        userNotifiedRef.current = false;
      }
      
      setSteadyInfo((prev) => {
        return (
          prev.steady === nextInfo.steady &&
          prev.period === nextInfo.period &&
          prev.popChanging === nextInfo.popChanging
            ? prev
            : nextInfo
        );
      });
    };

    // Check immediately
    checkStability();

    // Listen to model changes to re-check when population changes
    const handleModelChange = (event) => {
      if (event === 'gameStep') {
        checkStability();
      }
    };

    mvc.onModelChange(handleModelChange);

    return () => {
      mvc.offModelChange(handleModelChange);
    };
  }, [detectStablePopulation, popWindowSize, popTolerance, steadyInfo.steady, setIsRunningCombined, setSteadyInfo, setShowStableDialog, setStableDetectionInfo]);

  // Memory telemetry is opt-in; when enabled we start the logger.
  useEffect(() => {
    if (!memoryTelemetryEnabled) {
      return undefined;
    }
    const base = getBackendApiBase() || '';
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const stopLogger = startMemoryLogger({
      label: 'GOL Memory',
      uploadEnabled: true,
      uploadUrl: `${normalizedBase}/v1/memory-samples`
    });
    return () => {
      stopLogger?.();
    };
  }, [memoryTelemetryEnabled]);

  // Periodic population sampling (1Hz) with ring buffer to avoid per-step overhead.
  // Samples capture the current model generation so charts can show true generation numbers
  // even if multiple generations advance between samples.
  useEffect(() => {
    const mvc = gameRef.current;
    if (!mvc || typeof mvc.model?.getCellCount !== 'function') return undefined;

    let cancelled = false;
    const sample = () => {
      if (cancelled) return;
      try {
        const model = gameRef.current?.model;
        if (!model || typeof model.getCellCount !== 'function') return;
        const population = Number(model.getCellCount() ?? 0);
        const generation = Number(
          typeof model.getGeneration === 'function' ? model.getGeneration() : 0
        );

        if (!Number.isFinite(population) || !Number.isFinite(generation)) {
          return;
        }

        const entry = { generation, population };
        const prev = Array.isArray(popHistoryRef.current) ? popHistoryRef.current : [];
        // Only add if changed from last entry
        const last = prev[prev.length - 1];
        if (last && last.generation === entry.generation && last.population === entry.population) {
          return; // No change, skip update
        }
        const globalThisSize = Math.max(1, Number(maxChartGenerations) || 5000);
        const next = prev.length >= globalThisSize
          ? [...prev.slice(-(globalThisSize - 1)), entry]
          : [...prev, entry];
        popHistoryRef.current = next;
        setPopulationHistory(next);
      } catch (e) {
        console.warn('population sampling failed:', e);
      }
    };

    const intervalId = globalThis.setInterval(sample, 1000);
    return () => {
      cancelled = true;
      globalThis.clearInterval(intervalId);
    };
  }, [maxChartGenerations, setPopulationHistory]);

  

  // Ensure offsetRef has the shape expected by canvas logic ({ x, y, cellSize })
  const offsetRef = useRef({
    x: initialViewport.offsetX ?? 0,
    y: initialViewport.offsetY ?? 0,
    cellSize: initialViewport.cellSize ?? 8, // fallback only for first load
    zoom: initialViewport.zoom ?? 1
  });
  const lastViewportRef = useRef({
    offsetX: initialViewport.offsetX ?? 0,
    offsetY: initialViewport.offsetY ?? 0,
    cellSize: initialViewport.cellSize ?? 8,
    zoom: initialViewport.zoom ?? 1
  });
  const updateViewportSnapshot = useCallback((nextViewport) => {
    if (!nextViewport) return;
    // If cellSize is missing after clear, preserve previous value
    const normalized = {
      offsetX: Number.isFinite(nextViewport.offsetX) ? nextViewport.offsetX : offsetRef.current.x,
      offsetY: Number.isFinite(nextViewport.offsetY) ? nextViewport.offsetY : offsetRef.current.y,
      cellSize: Number.isFinite(nextViewport.cellSize)
        ? nextViewport.cellSize
        : lastViewportRef.current.cellSize,
      zoom: Number.isFinite(nextViewport.zoom)
        ? nextViewport.zoom
        : lastViewportRef.current.zoom
    };
    // Only update if the viewport actually changed
    const last = lastViewportRef.current;
    if (
      last.offsetX !== normalized.offsetX ||
      last.offsetY !== normalized.offsetY ||
      last.cellSize !== normalized.cellSize
    ) {
      offsetRef.current.x = normalized.offsetX;
      offsetRef.current.y = normalized.offsetY;
      offsetRef.current.cellSize = normalized.cellSize;
      setViewportSnapshot(normalized);
      lastViewportRef.current = { ...normalized };
      try { useUiDao.getState().setCellSize(normalized.cellSize); } catch (e) { console.error(e); }
    }
  }, [setViewportSnapshot]);
  // Keep a ref to the current color scheme key so the layout effect
  // doesn't need to capture uiState in its dependency array.
  const colorSchemeKeyRef = useRef(useUiDao.getState().colorSchemeKey || 'bio');
  const colorSchemeKey = useUiDao.getState().colorSchemeKey;
  useEffect(() => { colorSchemeKeyRef.current = colorSchemeKey || 'bio'; }, [colorSchemeKey]);

  // Start a controlled drag from the palette into the canvas. This sets the
  // selected shape/tool on the controller and updates controller toolState
  // as the pointer moves so the normal overlay preview code can render.
  // 'ghostEl' is unused, remove it to fix lint error
  const startPaletteDrag = useCallback((shape, startEvent) => {
    try {
      const controller = gameRef.current && gameRef.current.controller;
      const canvas = canvasRef.current;
      if (!controller || !canvas) return () => {};

      // Ensure selection and tool are set
      try { gameRef.current.setSelectedShape?.(shape); } catch (e) { console.error(e); }
      try { gameRef.current.setSelectedTool?.('shapes'); } catch (e) { console.error(e); }

      // compute initial cell and set tool state
      const getEffectiveCellSize = () => (offsetRef?.current?.cellSize || cellSize);
      const updateLastFromEvent = (ev) => {
        try {
          const pt = eventToCellFromCanvas(ev, canvas, offsetRef, getEffectiveCellSize());
          if (pt) {
            controller._setToolState({ selectedShapeData: shape, start: pt, last: pt, dragging: true }, { updateOverlay: true });
          }
        } catch (e) { console.error(e); }
      };

      // Ghost element is invisible; canvas overlay provides visual feedback

      updateLastFromEvent(startEvent);

      const onMove = (ev) => updateLastFromEvent(ev);
      
      // Define handlers together in a way that avoids forward references
      const handlers = {};
      
      const cleanup = () => {
        try { document.removeEventListener('pointermove', onMove); } catch (e) { console.error(e); }
        try { document.removeEventListener('pointerup', handlers.onUp); } catch (e) { console.error(e); }
        try { document.removeEventListener('pointercancel', handlers.onCancel); } catch (e) { console.error(e); }
        try { controller._setToolState({ start: null, last: null, dragging: false }, { updateOverlay: true }); } catch (e) { console.error(e); }
      };
      
      handlers.onUp = (ev) => {
        try {
          updateLastFromEvent(ev);
          const finalPt = eventToCellFromCanvas(ev, canvas, offsetRef, getEffectiveCellSize());
          if (finalPt) {
            // Delegate to controller's tool mouse-up handler so undo/diffs are recorded
            try {
              controller.handleToolMouseUp(finalPt);
            } catch (e) {
              // Fallback: place directly on model
              try { controller.model.placeShape(finalPt.x, finalPt.y, controller.model.getSelectedShape()); } catch (err) { console.error(err); }
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          cleanup();
        }
      };
      handlers.onCancel = () => {
        cleanup();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', handlers.onUp);
      document.addEventListener('pointercancel', handlers.onCancel);

      // return cleanup
      return cleanup;
    } catch (e) {
      console.error(e);
      return () => {};
    }
  }, [canvasRef, gameRef, cellSize]);
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay,
    // Pass a getter so the hook can access the model once GameMVC initializes
    model: () => (gameRef.current ? gameRef.current.model : null),
    setSelectedShape
  });

  // Preload shapes into IndexedDB on startup. Strategy can be configured
  // via globalThis.GOL_PRELOAD_STRATEGY or REACT_APP_PRELOAD_SHAPES; default is 'background'.
  const preloadStrategy = (typeof globalThis !== 'undefined' && globalThis.GOL_PRELOAD_STRATEGY) || process.env.REACT_APP_PRELOAD_SHAPES || 'background';
  const { loading: shapesLoading, progress: shapesProgress, error: shapesError, ready: shapesReady, start: shapesStart } = useInitialShapeLoader({ strategy: preloadStrategy, autoStart: false });

  useEffect(() => {
    if (shapeManager?.refreshShapes) {
      setOnImportSuccess(() => () => shapeManager.refreshShapes());
    }
  }, [setOnImportSuccess, shapeManager]);

  // Notification snackbar when shapes catalog becomes ready
  useEffect(() => {
    if (shapesReady) {
      setShapesNotifOpen(true);
    }
  }, [shapesReady, setShapesNotifOpen]);

  // Login required snackbar
  useEffect(() => {
    const handleNeedLogin = (event) => {
      setLoginNotifMessage(event.detail?.message || 'Please login.');
      setLoginNotifOpen(true);
    };
    globalThis.addEventListener('auth:needLogin', handleNeedLogin);
    return () => globalThis.removeEventListener('auth:needLogin', handleNeedLogin);
  }, [setLoginNotifMessage, setLoginNotifOpen]);

  // track cursor using the canvas DOM element and push canonical cursor
  // updates into the model so the renderer can use a single source of truth
  const cursorRecomputeRef = useRef(null);
  const handleCursor = useCallback((pt) => {
    try { gameRef.current?.model?.setCursorPositionModel?.(pt); } catch (e) { console.error(e); }
  }, [gameRef]);

  const cursorCell = useGridMousePosition({
    canvasRef,
    cellSize,
    offsetRef,
    recomputeRef: cursorRecomputeRef,
    onCursor: handleCursor
  });

  // Overlay is driven exclusively by controller + tool getOverlay(). Ensure
  // cursor is refreshed on shape change or viewport change even if the mouse
  // does not move (e.g., zoom while stationary, shape selection from recents).
  useEffect(() => {
    const model = gameRef.current?.model;
    const controller = gameRef.current?.controller;
    if (!model || typeof model.addObserver !== 'function') return undefined;

    const observer = (event) => {
      if (!['selectedShapeChanged', 'viewportChanged'].includes(event)) return;
      try {
        const recompute = cursorRecomputeRef.current;
        const recomputedPoint = typeof recompute === 'function' ? recompute() : null;
        if (recomputedPoint && model?.setCursorPositionModel) {
          model.setCursorPositionModel(recomputedPoint);
        }
      } catch (e) {
        // ignore recompute errors
      }

      try {
        if (controller && typeof controller.updateToolOverlay === 'function') {
          controller.updateToolOverlay();
        }
      } catch (e) {
        try { console.error('[GameOfLifeApp] overlay refresh error:', e); } catch (err) { console.error(err); }
      }
    };

    model.addObserver(observer);
    return () => model.removeObserver(observer);
  }, [cursorRecomputeRef, gameRef]);

  // --- Handlers ---
  const handleSelectShape = useCallback(shape => {
    gameRef.current?.setSelectedShape?.(shape);
    shapeManager.selectShape(shape);
  }, [shapeManager, gameRef]);

  const handleAddRecent = useCallback((shape) => {
    shapeManager.addRecentShape?.(shape);
  }, [shapeManager]);

  // ScriptPanel integration: listen for script events and route them into the app
  useEffect(() => {
    const onPlace = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const { idOrName, x, y, shape } = detail;
        const controller = gameRef.current && gameRef.current.controller;
        const model = controller && controller.model;

        // If caller provided a full shape object, select it first
        if (shape) {
          try { shapeManager.selectShape(shape); } catch (e) { console.error(e); }
        } else if (idOrName && shapeManager && typeof shapeManager.selectShape === 'function') {
          // try to select by id or name if possible; selectShape will also add to recents
          try {
            // shapeManager may expose a shapes cache; try best-effort lookup
            const found = (shapeManager.shapes || []).find(s => String(s.id) === String(idOrName) || String(s.name) === String(idOrName));
            if (found) shapeManager.selectShape(found);
          } catch (e) { console.error(e); }
        }

        if (model && typeof model.placeShape === 'function' && typeof x === 'number' && typeof y === 'number') {
          try {
            model.placeShape(Math.floor(x), Math.floor(y), model.getSelectedShape());
          } catch (e) {
            // fallback: if selected shape not available, try to load provided shape into grid
            try {
              if (shape && typeof loadGridIntoGame === 'function') {
                // place the shape by loading its live cells at the requested offset
                loadGridIntoGame(gameRef, new Set((shape.liveCells || shape.cells || []).map(c => `${c[0]},${c[1]}`)));
              }
            } catch (err) { console.error(err); }
          }
        }
      } catch (err) { /* swallow */ }
    };

    const onCapture = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const shape = detail.shape || detail;
        if (shape) {
          try { handleAddRecent(shape); } catch (e) { console.error(e); }
        }
      } catch (err) { console.error(err); }
    };

    const onSelectTool = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const tool = detail.tool || detail.toolName || detail;
        if (tool) {
          try { setSelectedTool(tool); } catch (e) { console.error(e); }
          try { gameRef.current?.setSelectedTool?.(tool); } catch (e) { console.error(e); }
        }
      } catch (err) { console.error(err); }
    };

    globalThis.addEventListener('gol:script:placeShape', onPlace);
    globalThis.addEventListener('gol:script:capture', onCapture);
    globalThis.addEventListener('gol:script:selectTool', onSelectTool);
    // Run shapes through real engine until steady
    const onRunUntilSteady = async (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const maxSize = Number(detail.maxSize) || 8;
        const centerX = Number(detail.centerX) || 0;
        const centerY = Number(detail.centerY) || 0;
        const controller = gameRef.current && gameRef.current.controller;
        const model = gameRef.current && gameRef.current.model;
        if (!controller || !model) {
          globalThis.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { error: 'engine not ready' } }));
          return;
        }

        const results = [];
        for (let s = 1; s <= maxSize; s++) {
          // clear grid
          try { model.clearModel && model.clearModel(); } catch (e) { model.liveCells = new Map(); }
          // build square shape (cells as offsets)
          const cells = [];
          const ox = -Math.floor(s / 2);
          const oy = -Math.floor(s / 2);
          for (let x = 0; x < s; x++) for (let y = 0; y < s; y++) cells.push([ox + x, oy + y]);
          // place shape centered at centerX, centerY
          try { model.placeShape(centerX, centerY, { cells }); } catch (e) { console.error(e); }

          // step until steady or until maxSteps using unified helper
          let runUntil;
          try { ({ runUntilSteadyModel: runUntil } = require('../model/stepping/runUntil')); } catch (_) { console.error(_); }
          if (typeof runUntil === 'function') {
            const { steady, steps } = await runUntil(model, controller, { maxSteps: Number(detail.maxSteps) || 200 });
            results.push({ size: s, steady, steps, finalCount: model.getCellCount() });
          } else {
            // Fallback: simple loop if helper not available
            const seen = new Set();
            let steady = false;
            let steps = 0;
            const maxSteps = Number(detail.maxSteps) || 200;
            while (steps < maxSteps) {
              const hash = model.getStateHash();
              if (seen.has(hash)) { steady = true; break; }
              seen.add(hash);
              try { await controller.step(); } catch (e) { break; }
              steps += 1;
              const newHash = model.getStateHash();
              if (newHash === hash) { steady = true; break; }
            }
            results.push({ size: s, steady, steps, finalCount: model.getCellCount() });
          }
        }

        globalThis.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { results } }));
      } catch (err) {
        try { globalThis.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { error: String(err) } })); } catch (e) { console.error(e); }
      }
    };
    const requestRender = () => {
      try {
        if (gameRef.current?.view?.renderer?.requestRender) {
          gameRef.current.view.renderer.requestRender();
          return;
        }
        if (typeof gameRef.current?.view?.render === 'function') {
          const liveCells = gameRef.current?.model?.getLiveCells?.() ?? new Map();
          const viewport = gameRef.current?.model?.getViewport?.() ?? { offsetX: 0, offsetY: 0, cellSize: 8 };
          gameRef.current.view.render(liveCells, viewport);
        }
      } catch (e) {
        console.error('script render refresh failed', e);
      }
    };

    const onScriptClearGrid = () => {
      try { gameRef.current?.controller?.clear?.(); } catch (e) { console.error('script clear controller failed', e); }
      try { gameRef.current?.model?.clearModel?.(); } catch (e) { console.error('script clear model failed', e); }
      try { gameRef.current?.clear?.(); } catch (e) { console.error('script clear mvc failed', e); }
      requestRender();
    };

    globalThis.addEventListener('gol:script:runUntilSteady', onRunUntilSteady);
    globalThis.addEventListener('gol:script:clearGrid', onScriptClearGrid);
    // Live-step updates from ScriptPanel: apply current script cells to main grid
    const onScriptStep = (ev) => {
      const detail = ev && ev.detail ? ev.detail : {};
      const cells = detail.cells || detail;
      const model = gameRef.current && gameRef.current.model;
      if (!model) return;
      // Only load the provided cells; do not clear the grid automatically
      try {
        loadGridIntoGame(gameRef, cells);
        requestRender();
      } catch (e) {
        try { globalThis.dispatchEvent(new CustomEvent('gol:script:error', { detail: { error: 'Failed to load script cells into model: ' + String(e) } })); } catch (ee) { console.error(ee); }
      }
    };
    globalThis.addEventListener('gol:script:step', onScriptStep);
    return () => {
      globalThis.removeEventListener('gol:script:placeShape', onPlace);
      globalThis.removeEventListener('gol:script:capture', onCapture);
      globalThis.removeEventListener('gol:script:selectTool', onSelectTool);
      globalThis.removeEventListener('gol:script:runUntilSteady', onRunUntilSteady);
      globalThis.removeEventListener('gol:script:clearGrid', onScriptClearGrid);
      globalThis.removeEventListener('gol:script:step', onScriptStep);
    };
  }, [shapeManager, handleAddRecent, setSelectedTool, gameRef]);
  // normalization of rotated shapes is handled by the shape manager
  // (useShapeManager.replaceRecentShapeAt) so it is not duplicated here.

  const handleRotateShape = useCallback((rotatedShape, index, opts = {}) => {
    // If caller requests an in-place replace of the recent slot, update the
    // shape manager's recent list at that index without adding a new recent
    // entry. Otherwise defer to rotateAndApply which handles selection+placement.
    if (opts?.inPlace) {
      try {
        // replaceRecentShapeAt now returns the normalized shape we stored
        const normalized = shapeManager?.replaceRecentShapeAt ? shapeManager.replaceRecentShapeAt(index, rotatedShape) : null;
        // Make the rotated shape the active selection (without adding a new recent)
        if (normalized && typeof shapeManager?.updateShapeState === 'function') {
          shapeManager.updateShapeState(normalized);
        }
        if (typeof drawWithOverlay === 'function') drawWithOverlay();
        return;
      } catch (e) {
         
        console.warn('handleRotateShape in-place failed, fallback to rotateAndApply', e);
        // fall through to default behavior
        console.error(e);
      }
    }
    rotateAndApply(gameRef, shapeManager, rotatedShape, index);
    if (typeof drawWithOverlay === 'function') drawWithOverlay();
  }, [drawWithOverlay, gameRef, shapeManager]);

  const persistGenerationZeroPatternFromCells = useCallback((cells) => {
    try {
      const normalized = Array.isArray(cells)
        ? cells
            .map((cell) => ({
              x: Math.floor(Number(cell?.x)),
              y: Math.floor(Number(cell?.y))
            }))
            .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y))
        : [];

      globalThis.localStorage?.setItem(
        GENERATION_ZERO_STORAGE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          cells: normalized
        })
      );
    } catch (error) {
      console.error('[useGameOfLifeAppRuntime] Failed to persist generation-zero pattern:', error);
    }
  }, []);

  const readGenerationZeroPattern = useCallback(() => {
    try {
      const raw = globalThis.localStorage?.getItem(GENERATION_ZERO_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.cells)) return [];
      return parsed.cells
        .map((cell) => ({
          x: Math.floor(Number(cell?.x)),
          y: Math.floor(Number(cell?.y))
        }))
        .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y));
    } catch (error) {
      console.error('[useGameOfLifeAppRuntime] Failed to read generation-zero pattern:', error);
      return [];
    }
  }, []);

  const persistGenerationZeroPattern = useCallback(() => {
    try {
      const model = gameRef.current?.model;
      if (!model || typeof model.getGeneration !== 'function' || typeof model.getLiveCells !== 'function') {
        return;
      }
      if (Number(model.getGeneration()) !== 0) return;

      const nextCells = Array.from(model.getLiveCells().keys()).map((key) => {
        const [x, y] = String(key).split(',').map(Number);
        return { x, y };
      });
      persistGenerationZeroPatternFromCells(nextCells);
    } catch (error) {
      console.error('[useGameOfLifeAppRuntime] Failed to snapshot generation-zero pattern:', error);
    }
  }, [gameRef, persistGenerationZeroPatternFromCells]);

  const resetToGenerationZero = useCallback(() => {
    try {
      setRunningState(false);
      const mvc = gameRef.current;
      if (!mvc || typeof mvc.importState !== 'function') return;

      let cells = readGenerationZeroPattern();
      if (!cells.length) {
        const fallbackModel = mvc.model;
        if (fallbackModel && typeof fallbackModel.getGeneration === 'function' && Number(fallbackModel.getGeneration()) === 0) {
          cells = Array.from(fallbackModel.getLiveCells().keys()).map((key) => {
            const [x, y] = String(key).split(',').map(Number);
            return { x, y };
          });
        }
      }

      const currentViewport = typeof mvc.getViewport === 'function' ? mvc.getViewport() : null;
      mvc.importState({
        model: {
          liveCells: cells,
          generation: 0,
          populationHistory: [],
          viewport: currentViewport
            ? {
                offsetX: Number(currentViewport.offsetX) || 0,
                offsetY: Number(currentViewport.offsetY) || 0,
                zoom: Number(currentViewport.zoom) || 1
              }
            : { offsetX: 0, offsetY: 0, zoom: 1 }
        }
      });

      popHistoryRef.current = [];
      snapshotsRef.current = [];
      setPopulationHistory([]);
      setGeneration(0);
      setSteadyInfo(INITIAL_STEADY_INFO);
      persistGenerationZeroPatternFromCells(cells);
      drawWithOverlay?.();

      try {
        globalThis.dispatchEvent?.(new CustomEvent('gol:sessionCleared'));
      } catch (e) {
        console.error('[useGameOfLifeAppRuntime] Failed to dispatch session-cleared event:', e);
      }
    } catch (error) {
      console.error('[useGameOfLifeAppRuntime] resetToGenerationZero failed:', error);
    }
  }, [
    drawWithOverlay,
    gameRef,
    persistGenerationZeroPatternFromCells,
    readGenerationZeroPattern,
    setGeneration,
    setPopulationHistory,
    setRunningState,
    setSteadyInfo,
    snapshotsRef
  ]);

  const step = useCallback(async () => {
    try {
      if (enableAdaCompliance) {
        await gameRef.current?.step?.(1, { forceExactGenerations: true });
      } else {
        await gameRef.current?.step?.();
      }
    } catch (error) {
      console.error('Step failed:', error);
    }
  }, [enableAdaCompliance, gameRef]);
  // Full game state initializer (used for Empty Grid)
  const initialize = useCallback(() => {
    // Reset all Zustand store state
    setPaletteOpen(false);
    setShowChart(false);
    setCaptureDialogOpen(false);
    setMyShapesDialogOpen(false);
    setImportDialogOpen(false);
    setCaptureData(null);
    setShowUIControls(true);
    setPopWindowSize(30);
    setGeneration(0);
    setSelectedTool('draw');
    setSelectedShape(null);
    // Add all other set* calls for Zustand state here as needed

    // Reset refs
    if (gameRef.current && typeof gameRef.current.reset === 'function') {
      gameRef.current.reset();
    }
    popHistoryRef.current = [];
    toolStateRef.current = {};

    // Optionally clear GameMVC/controller state
    // (e.g., gameRef.current = null; or re-instantiate GameMVC)

    // Optionally reset any local state or call other initialization logic
    try {
      // Cancel any in-flight hashlife work and clear its caches so it
      // cannot later re-populate the view after the UI model is cleared.
      try { hashlifeAdapter.cancel(); } catch (e) { console.error(e); }
      try { hashlifeAdapter.clearCache(); } catch (e) { console.error(e); }
    } catch (e) {
      console.error(e);
    }
    try { gameRef.current?.clear?.(); } catch (e) { console.error('gameRef.clear failed', e); }
    try {
      if (typeof globalThis !== 'undefined' && typeof globalThis.dispatchEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent('gol:sessionCleared'));
      }
    } catch (e) { console.error(e); }
  }, [setCaptureData, setCaptureDialogOpen, setGeneration, setImportDialogOpen, setMyShapesDialogOpen, setPaletteOpen, setPopWindowSize, setSelectedShape, setSelectedTool, setShowChart, setShowUIControls]);
  // Use initialize for Empty Grid
  const clear = initialize;
  // Running state management functions moved earlier
  // openPalette/closePalette are now provided by Zustand

  // Protected save function for captured shapes
  // TODO: Revisit this useCallback dependency array. ESLint requires many setters; consider refactoring if possible.
  const saveCapturedShapeAction = useCallback(async (shapeData) => {
    try {
      // Save to backend first (assume saveCapturedShapeToBackend is imported)
      const saved = await saveCapturedShapeToBackend(shapeData);
      const now = Date.now();
      const localShape = {
        id: saved?.id || saved?._id || `shape-${now}`,
        name: saved?.name || shapeData.name,
        cells: Array.isArray(shapeData?.pattern) ? shapeData.pattern.map(c => ({ x: c.x, y: c.y })) : [],
        meta: {
          width: shapeData?.width,
          height: shapeData?.height,
          cellCount: shapeData?.cellCount,
          savedAt: new Date(now).toISOString(),
          source: 'capture-tool'
        }
      };
      try {
        shapeManager?.selectShape?.(localShape);
        gameRef.current?.setSelectedTool?.('shapes');
      } catch (e) {
        // Log the error for debugging purposes
        console.error('Error selecting shape or setting tool:', e);
      }
      return saved;
    } catch (error) {
      if (error.duplicate) {
        // Show duplicate modal
        setDuplicateShape(error.existingShape);
        setShowDuplicateDialog(true);
        throw new Error('Duplicate shape - handled by modal');
      }
      throw error;
    }
  }, [setDuplicateShape, setShowDuplicateDialog, shapeManager]);

  const { wrappedAction: handleSaveCapturedShape, renderDialog: renderCaptureSaveDialog } = useProtectedAction(saveCapturedShapeAction);

  const saveCaptureHandlerRef = React.useRef(handleSaveCapturedShape);

  React.useEffect(() => {
    saveCaptureHandlerRef.current = handleSaveCapturedShape;
  }, [handleSaveCapturedShape]);

  React.useEffect(() => {
    setOnSaveCapture((...args) => saveCaptureHandlerRef.current?.(...args));
  }, [setOnSaveCapture]);

  const handleLoadGrid = useCallback((liveCells) => {
    if (gameRef.current) {
      // Clear existing cells first so the loaded grid replaces the world
      try {
        if (typeof gameRef.current.clear === 'function') {
          gameRef.current.clear();
        }
      } catch (e) {
        // Log non-fatal errors when attempting to clear so issues are visible
         
        console.warn('handleLoadGrid: failed to clear existing grid before load', e);
      }
      loadGridIntoGame(gameRef, liveCells);
    } else {
      // If the MVC isn't initialized yet, stash the load and apply once ready
      // We store the raw liveCells; applyPendingLoad will clear before applying.
      pendingLoadRef.current = liveCells;
    }
  }, []);

  // Initialize the Game MVC synchronously after the component mounts and the
  // canvas ref is attached. useLayoutEffect runs before paint so this avoids
  // a visible flicker on first render.
  // helpers to keep the layout effect small/clear and reduce cognitive complexity
  const applyPendingLoad = useCallback((mvc) => {
    const pending = pendingLoadRef.current;
    if (pending) {
      try {
        // Clear existing cells before applying the pending load so the load
        // fully replaces the current world.
        try {
          if (typeof mvc.clear === 'function') {
            mvc.clear();
          }
        } catch (e) {
          // Log non-fatal errors when attempting to clear so issues are visible.
           
          console.warn('applyPendingLoad: mvc.clear threw an error', e);
        }
        // pending may be the raw liveCells (Map/array) or an object with .liveCells
  const toLoad = pending.liveCells === undefined ? pending : pending.liveCells;
        loadGridIntoGame(gameRef, toLoad);
      } catch (e) {
        // Log non-fatal initialization errors to aid debugging without breaking
        // runtime behavior. Do not rethrow to preserve current behavior.
         
        console.warn('applyPendingLoad: failed to load pending grid', e);
      }
      pendingLoadRef.current = null;
    }
  }, []);

  const syncOffsetFromMVC = useCallback((mvc) => {
    if (mvc && typeof mvc.getViewport === 'function') {
      const vp = mvc.getViewport();
      if (vp) {
        updateViewportSnapshot(vp);
      }
    }
  }, [updateViewportSnapshot]);

  const applyInitialColorScheme = useCallback((mvc) => {
    try {
      const scheme = getColorSchemeFromKey(colorSchemeKeyRef.current || 'bio');
      mvc.setColorScheme?.(scheme);
      mvc.controller?.requestRender?.();
    } catch (e) {
      // Log non-fatal initialization errors for diagnostics
       
      console.error('applyInitialColorScheme error:', e);
    }
  }, []);

  useLayoutEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return undefined;
    // If preload strategy is blocking, delay MVC initialization until shapes finish loading
    if (preloadStrategy === 'blocking') {
      if (shapesLoading) return undefined; // wait for loader to finish
      if (shapesError) return undefined; // loader failed; do not initialize in blocking mode
    }
    if (gameRef.current) return undefined; // already initialized

    try {
      const mvc = new GameMVC(canvasEl, {});
      gameRef.current = mvc;

      try {
        const pct = Number(randomRectPercent);
        const prob = Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 0;
        mvc.controller?._setToolState?.({ prob });
      } catch (seedErr) {
        console.warn?.('Failed to seed randomRect prob on init:', seedErr);
      }

      // Inject controller methods into useGameDao for model-driven imperative actions
      setupGameDaoFromMVC(mvc);

      // Inject toolMap into useToolDao for global tool/overlay access
      setupToolDaoFromMVC(mvc);

      // Setup running state synchronization
      const syncRunningState = (event, data) => {
        if (event === 'runningStateChanged') {
          const modelIsRunning = data?.isRunning ?? false;
          setIsRunning(modelIsRunning);
          isRunningRef.current = modelIsRunning;
        }
      };
      mvc.onModelChange(syncRunningState);
      mvc._runningStateSyncObserver = syncRunningState; // Store for cleanup
      // Initial sync
      const initialRunning = mvc.model?.getIsRunning?.() ?? false;
      setIsRunning(initialRunning);
      isRunningRef.current = initialRunning;

      // Sync select React states (tool, shape, running) with the MVC model so
      // UI components simply reflect the authoritative controller state.
      try {
        const model = mvc.model;
        if (model) {
          if (typeof model.getSelectedTool === 'function') {
            // Initialize local selection from model
            setSelectedTool(model.getSelectedTool());
          }
          if (typeof model.getSelectedShape === 'function') {
            setSelectedShape(model.getSelectedShape());
          }
          if (typeof model.getIsRunning === 'function') {
            setIsRunning(!!model.getIsRunning());
          }
          if (typeof model.getGeneration === 'function') {
            setGeneration(model.getGeneration());
          }
          if (typeof model.getPopulationHistory === 'function') {
            const initialHistory = model.getPopulationHistory() || [];
            popHistoryRef.current = initialHistory;
            setPopulationHistory(initialHistory);
          }
        }
        const observer = (event, data) => {
          if (event === 'selectedToolChanged') {
            try { setSelectedTool(data); } catch (e) { /* ignore */ }
          } else if (event === 'selectedShapeChanged') {
            try { setSelectedShape(data); } catch (e) { /* ignore */ }
          } else if (event === 'runningStateChanged') {
            try {
              const nextRunning = typeof data === 'object' && data !== null && 'isRunning' in data
                ? data.isRunning
                : data;
              setIsRunning(!!nextRunning);
            } catch (e) { /* ignore */ }
          } else if (event === 'viewportChanged') {
            updateViewportSnapshot(data);
          } else if (event === 'gameStep' || event === 'reset' || event === 'loadGrid') {
            try {
              const gen = typeof model?.getGeneration === 'function' ? model.getGeneration() : 0;
              setGeneration(gen);
            } catch (e) { console.error('Failed to sync generation:', e); }
          } else if (event === 'modelCleared' || event === 'gameCleared') {
            popHistoryRef.current = [];
            setPopulationHistory([]);
            setGeneration(0);
          } else if (event === 'stateImported') {
            try {
              const nextHistory = Array.isArray(data?.populationHistory)
                ? [...data.populationHistory]
                : (typeof model?.getPopulationHistory === 'function' ? model.getPopulationHistory() : []);
              popHistoryRef.current = nextHistory;
              setPopulationHistory(nextHistory);
              const importedGen = typeof model?.getGeneration === 'function' ? model.getGeneration() : 0;
              setGeneration(importedGen);
            } catch (e) { /* ignore */ }
          } else if (event === 'captureCompleted') {
            try {
              setCaptureData(data || null);
              setCaptureDialogOpen(true);
            } catch (e) {
              console.error('Failed to open capture dialog from captureCompleted event:', e);
            }
          } else if (event === 'performanceSettingsChanged' && data) {
            setPerformanceCaps((prev) => {
              const nextFps = Number.isFinite(Number(data.maxFPS)) ? Number(data.maxFPS) : prev.maxFPS;
              const nextGps = Number.isFinite(Number(data.maxGPS)) ? Number(data.maxGPS) : prev.maxGPS;
              const nextEnableFps = typeof data.enableFPSCap === 'boolean' ? data.enableFPSCap : prev.enableFPSCap;
              const nextEnableGps = typeof data.enableGPSCap === 'boolean' ? data.enableGPSCap : prev.enableGPSCap;
              if (nextFps === prev.maxFPS && nextGps === prev.maxGPS && nextEnableFps === prev.enableFPSCap && nextEnableGps === prev.enableGPSCap) return prev;
              return {
                ...prev,
                maxFPS: Math.max(1, Math.min(120, nextFps)),
                maxGPS: Math.max(1, Math.min(60, nextGps)),
                enableFPSCap: !!nextEnableFps,
                enableGPSCap: !!nextEnableGps
              };
            });
          }
          if (
            event === 'cellChanged' ||
            event === 'cellsChangedBulk' ||
            event === 'gameStep' ||
            event === 'modelCleared' ||
            event === 'gameCleared' ||
            event === 'stateImported' ||
            event === 'loadGrid' ||
            event === 'reset'
          ) {
            persistGenerationZeroPattern();
          }
        };
        model.addObserver(observer);
        // Ensure we remove the observer when the MVC instance is destroyed
        // by capturing the observer reference in the mvc instance for cleanup.
        mvc._reactModelObserver = observer;
        // Also listen for captureCompleted events from the model so the
        // React UI can open the capture dialog when the user finishes a capture.
        // Remove legacy captureObserver and setUIState usage
      } catch (e) {
        // Non-fatal; continue initialization
         
        console.warn('Failed to sync selectedTool from MVC model:', e);
      }

      try {
        const initialPerformance = mvc.getPerformanceSettings?.();
        if (initialPerformance) {
          setPerformanceCaps({
            maxFPS: Math.max(1, Math.min(120, Number(initialPerformance.maxFPS) || 60)),
            maxGPS: Math.max(1, Math.min(60, Number(initialPerformance.maxGPS) || 30)),
            enableFPSCap: !!initialPerformance.enableFPSCap,
            enableGPSCap: !!initialPerformance.enableGPSCap
          });
        }
      } catch (e) {
        console.warn('Failed to read initial performance settings:', e);
      }

      applyPendingLoad(mvc);
      syncOffsetFromMVC(mvc);
      applyInitialColorScheme(mvc);
    } catch (err) {
       
      console.error('Failed to initialize GameMVC:', err);
    }

    return () => {
      if (gameRef.current) {
        try {
          // Remove any observer we registered on the model
          try {
            const obs = gameRef.current._reactModelObserver;
            if (obs && gameRef.current.model && typeof gameRef.current.model.removeObserver === 'function') {
              gameRef.current.model.removeObserver(obs);
            }
          } catch (e) {
            // ignore
          }
          if (typeof gameRef.current.destroy === 'function') {
            gameRef.current.destroy();
          }
        } catch (e) {
          // Log destruction errors for diagnostics; cleanup should continue.
           
          console.error('Error destroying GameMVC instance during unmount:', e);
        }
        gameRef.current = null;
      }
    };
  }, [applyPendingLoad, syncOffsetFromMVC, applyInitialColorScheme, preloadStrategy, shapesLoading, shapesError, updateViewportSnapshot, setPerformanceCaps, setIsRunning, setPopulationHistory, setSelectedShape, setSelectedTool, setGeneration, randomRectPercent, setCaptureData, setCaptureDialogOpen, persistGenerationZeroPattern]);
  // UI callback to request a tool change. This always goes through the controller/model.
  const requestToolChange = React.useCallback((tool) => {
    try {
      gameRef.current?.setSelectedTool?.(tool);
    } catch (e) {
      console.error('Error setting selected tool on gameRef:', e);
    }
    if (tool === 'shapes') {
      setPaletteOpen(true);
    }
  }, [setPaletteOpen]);

  // --- Controls props ---
  const colorScheme = getColorSchemeFromKey(useUiDao.getState().colorSchemeKey || 'bio');
  // Use getLiveCells from gameDao for canonical live cell state
  const getLiveCells = useGameDao(state => state.getLiveCells);
  const controlsProps = useMemo(() => ({
    selectedTool,
    // setSelectedTool: setSelectedToolLocal, // removed, now handled by context
    onCenterViewport: () => gameRef.current?.centerOnLiveCells?.(),
    model: gameRef.current ? gameRef.current.model : null,
    colorSchemeKey: useUiDao.getState().colorSchemeKey || 'bio',
    setColorSchemeKey,
    colorSchemes,
    isRunning,
    setIsRunning: setIsRunningCombined,
    step,
    draw: drawWithOverlay,
    clear,
    resetToGenerationZero,
    snapshotsRef,
    setSteadyInfo,
    canvasRef,
    offsetRef,
    cellSize: viewportSnapshot.cellSize,
    setCellAlive,
    popHistoryRef,
    setShowChart,
    getLiveCells,
    popWindowSize,
    setPopWindowSize,
    popTolerance,
    setPopTolerance,
    selectShape: handleSelectShape,
    drawWithOverlay: drawWithOverlay,
    setPaletteOpen,
    steadyInfo,
    toolStateRef,
    cursorCell,
    onLoadGrid: handleLoadGrid,
    showSpeedGauge: useUiDao.getState().showSpeedGauge ?? true,
    setShowSpeedGauge,
    detectStablePopulation,
    setDetectStablePopulation: setDetectStablePopulationPreference,
    maxChartGenerations,
    setMaxChartGenerations,
    memoryTelemetryEnabled,
    setMemoryTelemetryEnabled,
    randomRectPercent,
    setRandomRectPercent,
    useHashlife,
    hashlifeMaxRun,
    hashlifeCacheSize,
    clearHashlifeCache,
    engineMode,
    isHashlifeMode,
    onStartNormalMode: startNormalMode,
    onStartHashlifeMode: startHashlifeMode,
    onStopAllEngines: stopAllEngines,
    onSetEngineMode: setEngineModeDirect,
    generationBatchSize,
    onSetGenerationBatchSize: setGenerationBatchSize,
    maxFPS: performanceCaps.maxFPS,
    maxGPS: performanceCaps.maxGPS,
    enableFPSCap: performanceCaps.enableFPSCap,
    enableGPSCap: performanceCaps.enableGPSCap,
    setMaxFPS,
    setMaxGPS,
    setEnableFPSCap,
    setEnableGPSCap,
    enableAdaCompliance,
    setEnableAdaCompliance: setEnableAdaComplianceWithUpdate,
    backendBase: getBackendApiBase(),
    onAddRecent: handleAddRecent,
    liveCellsCount: getLiveCells().size,
    generation,
    useWebWorker,
    setUseWebWorker: setUseWebWorkerPreference
  }), [
    setSteadyInfo,selectedTool, setColorSchemeKey, isRunning, setIsRunningCombined,
    step, drawWithOverlay, clear, resetToGenerationZero, viewportSnapshot, setCellAlive, setShowChart, getLiveCells, popWindowSize,
    setPopWindowSize, popTolerance, setPopTolerance, handleSelectShape, setPaletteOpen, steadyInfo, handleLoadGrid,
    setShowSpeedGauge, detectStablePopulation, setDetectStablePopulationPreference, maxChartGenerations,
    setMaxChartGenerations, memoryTelemetryEnabled, setMemoryTelemetryEnabled, randomRectPercent,
    setRandomRectPercent, useHashlife, hashlifeMaxRun, hashlifeCacheSize, clearHashlifeCache, engineMode,
    startNormalMode, startHashlifeMode, stopAllEngines, setEngineModeDirect, generationBatchSize,
    setGenerationBatchSize, performanceCaps, setMaxFPS, setMaxGPS, setEnableFPSCap, setEnableGPSCap,
    enableAdaCompliance, setEnableAdaComplianceWithUpdate,
    handleAddRecent, generation, useWebWorker, setUseWebWorkerPreference, cursorCell, isHashlifeMode,
    offsetRef
  ]);

  const showSpeedGauge = useUiDao.getState().showSpeedGauge ?? true;
  const liveCellsCount = getLiveCells().size;

  return {
    canvasRef,
    drawWithOverlay,
    gameRef,
    controlsProps,
    selectedTool,
    requestToolChange,
    shapesLoading,
    shapesProgress,
    shapesError,
    shapesStart,
    shapeManager,
    handleSelectShape,
    colorScheme,
    selectedShape,
    handleRotateShape,
    startPaletteDrag,
    setSelectedTool,
    toolState,
    setToolState,
    shapesReady,
    paletteOpen,
    setPaletteOpen,
    captureDialogOpen,
    setCaptureDialogOpen,
    captureData,
    onCloseCaptureDialog,
    onSaveCapture,
    handleSaveCapturedShape,
    myShapesDialogOpen,
    setMyShapesDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    cursorCell,
    populationHistory,
    setPopulationHistory,
    popWindowSize,
    setPopWindowSize,
    generation,
    setGeneration,
    maxChartGenerations,
    setMaxChartGenerations,
    setShowChart,
    isRunning,
    showUIControls,
    setShowUIControls,
    snapshotsRef,
    setSteadyInfo,
    shapesNotifOpen,
    setShapesNotifOpen,
    loginNotifOpen,
    setLoginNotifOpen,
    loginNotifMessage,
    renderCaptureSaveDialog,
    onImportSuccess,
    showDuplicateDialog,
    setShowDuplicateDialog,
    duplicateShape,
    setDuplicateShape,
    stableDetectionInfo,
    setStableDetectionInfo,
    showStableDialog,
    setShowStableDialog,
    setIsRunningCombined,
    enableAdaCompliance,
    userNotifiedRef,
    detectStablePopulation,
    showFirstLoadWarning,
    setShowFirstLoadWarning,
    showSpeedGauge,
    liveCellsCount,
    offsetRef,
    isSmall,
    clear,
    resetToGenerationZero,
    step,
    colorSchemeKey: useUiDao.getState().colorSchemeKey || 'bio'
  };
}

export default useGameOfLifeAppRuntime;
