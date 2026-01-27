import useMediaQuery from '@mui/material/useMediaQuery';
// canvas manager removed in favor of single MVC renderer
import { useShapeManager } from './hooks/useShapeManager';
import useGridMousePosition from './hooks/useGridMousePosition';
// Overlay generation now lives in controller/tool; no React-level overlays here.
import useInitialShapeLoader from '../hooks/useInitialShapeLoader';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LoadingShapesOverlay from './LoadingShapesOverlay';
import ScriptExecutionHUD from './ScriptExecutionHUD';
import { loadGridIntoGame, rotateAndApply } from './utils/gameUtils';
import { colorSchemes } from '../model/colorSchemes';
// tools are registered by GameMVC; no direct tool imports needed here
import { saveCapturedShapeToBackend, getBackendApiBase } from '../utils/backendApi';
import { useProtectedAction } from '../auth/useProtectedAction';
import GameUILayout from './GameUILayout';
import FirstLoadWarningDialog from './FirstLoadWarningDialog';
import './GameOfLife.css';
import React, { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { GameMVC } from '../controller/GameMVC';
import { startMemoryLogger } from '../utils/memoryLogger';
import { computePopulationChange } from '../utils/stabilityMetrics';
import hashlifeAdapter from '../model/hashlife/adapter';
import { eventToCellFromCanvas } from '../controller/utils/canvasUtils';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

// tools are registered by GameMVC.controller during initialization
function getColorSchemeFromKey(key) {
  const base = colorSchemes[key] || {};
  const copy = { ...base };
  if (typeof Object.freeze === 'function') Object.freeze(copy);
  return copy;
}

const INITIAL_STEADY_INFO = Object.freeze({ steady: false, period: 0, popChanging: false });

// The component has a slightly large body by necessity (many hooks/handlers).
// Disable the cognitive-complexity rule here to keep the implementation readable
// while we keep initialization logic small and well-factored above.
// Use the core 'complexity' rule name so ESLint doesn't require sonarjs plugin
// eslint-disable-next-line complexity
function GameOfLifeApp(props) {
  // Helper to create default UI state
  const createDefaultUIState = () => {
    // Check if ADA compliance is enabled
    let adaEnabled = true;
    try {
      const stored = globalThis.localStorage?.getItem('enableAdaCompliance');
      adaEnabled = stored === 'false' ? false : true;
    } catch {}
    
    return {
      showChart: false,
      showSpeedGauge: (() => { try { const v = globalThis.localStorage.getItem('showSpeedGauge'); return v == null ? true : JSON.parse(v); } catch { return true; } })(),
      colorSchemeKey: (() => { 
        try { 
          const v = globalThis.localStorage.getItem('colorSchemeKey'); 
          // Force ADA-safe scheme when ADA mode is on
          if (adaEnabled) return 'adaSafe';
          return v || 'bio'; 
        } catch { 
          return adaEnabled ? 'adaSafe' : 'bio'; 
        } 
      })(),
      captureDialogOpen: false,
      paletteOpen: false,
      myShapesDialogOpen: false,
      importDialogOpen: false,
      captureData: null,
      showChrome: true
    };
  };

  // ============================================================================
  // SECTION 1: ALL useState() CALLS
  // ============================================================================
  const [uiState, setUIState] = useState(props.initialUIState || createDefaultUIState());
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [popWindowSize, setPopWindowSize] = useState(() => {
    try { 
      const v = globalThis.localStorage.getItem('popWindowSize'); 
      if (v != null) { 
        const n = Number.parseInt(v, 10); 
        if (!Number.isNaN(n) && n > 0 && n !== 50 && n !== 10) return n; 
      } 
    } catch {};
    return 30;
  });
  const [popTolerance, setPopTolerance] = useState(() => {
    try { const v = globalThis.localStorage.getItem('popTolerance'); if (v != null) { const n = Number.parseInt(v, 10); if (!Number.isNaN(n) && n >= 0) return n; } } catch {};
    return 3;
  });
  const [enableAdaCompliance, setEnableAdaCompliance] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('enableAdaCompliance');
      if (stored === 'true' || stored === 'false') return stored === 'true';
      if (stored != null) return Boolean(JSON.parse(stored));
      return true;
    } catch {
      return true;
    }
  });
  const [maxChartGenerations, setMaxChartGenerations] = useState(5000);
  
  // Store user's preferred FPS/GPS (independent of ADA caps)
  // Defaults to maximum speed if not set
  // Removed unused preferredPerformance and setPreferredPerformance
  
  // Compute effective performance caps (apply ADA limits if enabled)
  const [performanceCaps, setPerformanceCaps] = useState(() => {
    try {
      const enableAdaComplianceStored = globalThis.localStorage.getItem('enableAdaCompliance');
      const adaEnabled = enableAdaComplianceStored === 'false' ? false : true;
      
      // If ADA is enabled, apply strict caps; otherwise use preferred values
      if (adaEnabled) {
        return { maxFPS: 2, maxGPS: 2, enableFPSCap: true, enableGPSCap: true };
      }
      // Use preferred values (defaults to max speed: 120/60)
      const maxFPS = Number.parseInt(globalThis.localStorage.getItem('maxFPS'), 10);
      const maxGPS = Number.parseInt(globalThis.localStorage.getItem('maxGPS'), 10);
      const enableFPSCap = globalThis.localStorage.getItem('enableFPSCap');
      const enableGPSCap = globalThis.localStorage.getItem('enableGPSCap');
      const resolvedMaxGPS = Number.isFinite(maxGPS) && maxGPS > 0 ? Math.max(1, Math.min(60, maxGPS)) : 60;
      return {
        maxFPS: Number.isFinite(maxFPS) && maxFPS > 0 ? Math.max(1, Math.min(120, maxFPS)) : 120,
        maxGPS: resolvedMaxGPS,
        enableFPSCap: enableFPSCap != null ? JSON.parse(enableFPSCap) : false,
        enableGPSCap: enableGPSCap != null ? JSON.parse(enableGPSCap) : false
      };
    } catch (e) {
      return { maxFPS: 120, maxGPS: 60, enableFPSCap: false, enableGPSCap: false };
    }
  });
  const [detectStablePopulation, setDetectStablePopulation] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('detectStablePopulation');
      if (stored === 'true' || stored === 'false') return stored === 'true';
      if (stored != null) return Boolean(JSON.parse(stored));
      return true;
    } catch {
      return true;
    }
  });
  const [useWebWorker, setUseWebWorker] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('useWebWorker');
      if (stored === 'true' || stored === 'false') return stored === 'true';
      return false;
    } catch {
      return false;
    }
  });
  const [steadyInfo, setSteadyInfo] = useState(INITIAL_STEADY_INFO);
  const [populationHistory, setPopulationHistory] = useState([]);
  const [memoryTelemetryEnabled, setMemoryTelemetryEnabled] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('memoryTelemetryEnabled');
      if (stored === 'true' || stored === 'false') {
        return stored === 'true';
      }
    } catch {}
    return false;
  });
  
  // Track whether to show first-load warning dialog
  const [showFirstLoadWarning, setShowFirstLoadWarning] = useState(() => {
    try {
      const hasSeenWarning = globalThis.localStorage?.getItem('gol-first-load-warning-seen');
      return !hasSeenWarning; // Show if they haven't seen it before
    } catch {
      return true; // Show on error (safer default)
    }
  });
  const [duplicateShape, setDuplicateShape] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [stableDetectionInfo, setStableDetectionInfo] = useState(null);
  const [showStableDialog, setShowStableDialog] = useState(false);
  const [randomRectPercent, setRandomRectPercent] = useState(() => {
    try {
      const v = globalThis.localStorage.getItem('randomRectPercent');
      if (v != null) {
        const n = Number.parseInt(v, 10);
        if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
      }
    } catch {}
    return 50;
  });
  const [useHashlife] = useState(() => {
    try { const v = globalThis.localStorage.getItem('useHashlife'); return v == null ? true : v === 'true'; } catch { return true; }
  });
  const [hashlifeMaxRun] = useState(() => {
    try { 
      const v = Number.parseInt(globalThis.localStorage.getItem('hashlifeMaxRun'), 10); 
      const MAX_SAFE_GENERATIONS = 1000000;
      if (Number.isFinite(v) && v > 0 && v <= MAX_SAFE_GENERATIONS) {
        return v;
      }
      return 1024;
    } catch { return 1024; }
  });
  const [hashlifeCacheSize] = useState(() => {
    try { const v = Number.parseInt(globalThis.localStorage.getItem('hashlifeCacheSize'), 10); return Number.isFinite(v) && v >= 0 ? v : 0; } catch { return 0; }
  });
  const [engineMode, setEngineMode] = useState('normal');
  const [generationBatchSize, setGenerationBatchSize] = useState(() => {
    try {
      const v = Number.parseInt(globalThis.localStorage.getItem('generationBatchSize'), 10);
      if (Number.isFinite(v) && v >= 1 && v <= 10000) {
        return v;
      }
      return 50;
    } catch { return 50; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false); // Will be set by mediaQuery useEffect
  const [viewportSnapshot, setViewportSnapshot] = useState({ offsetX: 0, offsetY: 0, cellSize: 8, zoom: 1 });
  const [shapesNotifOpen, setShapesNotifOpen] = useState(false);
  const [loginNotifOpen, setLoginNotifOpen] = useState(false);
  const [loginNotifMessage, setLoginNotifMessage] = useState('');

  // Refs and constants (must come after useState, before effects/callbacks)
  const isHashlifeMode = false;
  const userNotifiedRef = useRef(false);
  const isRunningRef = useRef(false);
  const snapshotsRef = useRef([]);
  const gameRef = useRef(null);
  const pendingLoadRef = useRef(null);
  const toolStateRef = useRef({});
  const popHistoryRef = useRef([]);
  const canvasRef = useRef(null);

  // Callbacks (after refs, before effects)
  
  const setUseWebWorkerPreference = useCallback((value) => {
    setUseWebWorker(value);
    try { globalThis.localStorage?.setItem('useWebWorker', JSON.stringify(value)); } catch (e) {}
  }, []);

  const clearHashlifeCache = useCallback(() => {
    try {
      hashlifeAdapter.clearCache();
      try { globalThis.console && console.debug('Hashlife cache cleared'); } catch (e) {}
    } catch (e) {
      try { console.error('Failed to clear hashlife cache', e); } catch (e2) {}
    }
  }, []);

  const setRunningState = useCallback((running) => {
    const modelIsRunning = !!running;
    try { console.debug('[GameOfLifeApp] setRunningState called:', modelIsRunning); } catch (e) {}
    setIsRunning(modelIsRunning);
    isRunningRef.current = modelIsRunning;
    // Always stop the controller loop if stopping
    if (!modelIsRunning && gameRef.current?.controller?.stopGame) {
      try { gameRef.current.controller.stopGame(); } catch (e) { console.warn('Failed to stop controller', e); }
    }
    if (gameRef.current?.model?.setRunningModel) {
      gameRef.current.model.setRunningModel(modelIsRunning);
    }
  }, []);

  const setIsRunningCombined = useCallback((running, mode = engineMode) => {
    try { console.debug('[GameOfLifeApp] setIsRunningCombined called:', { running, mode, engineMode }); } catch (e) {}
    if (running && mode !== engineMode) {
      setEngineMode(mode);
    }
    setRunningState(running);
  }, [setRunningState, engineMode]);

  // Effects (after all refs and callbacks)
  // Keep generation in sync with the model
  useEffect(() => {
    const mvc = gameRef.current;
    if (!mvc || typeof mvc.onModelChange !== 'function') return;

    // Lightweight guard to avoid redundant updates
    const updateGeneration = () => {
      const gen = mvc.model?.getGeneration?.() ?? 0;
      setGeneration((prevGen) => (prevGen !== gen ? gen : prevGen));
    };

    // Run once to initialize
    updateGeneration();

    // Only respond to events that actually advance generation or reset/load
    const handler = (event) => {
      if (event === 'gameStep' || event === 'reset' || event === 'loadGrid') updateGeneration();
    };
    mvc.onModelChange(handler);

    return () => mvc.offModelChange(handler);
  }, []); // Only run once on mount
  
  // Save generation batch size to localStorage
  useEffect(() => {
    try {
      globalThis.localStorage.setItem('generationBatchSize', generationBatchSize.toString());
    } catch {}
  }, [generationBatchSize]);
  useEffect(() => { popHistoryRef.current = populationHistory; }, [populationHistory]);
  const isSmall = useMediaQuery('(max-width:900px)');
  useEffect(() => { setSidebarOpen(!isSmall); }, [isSmall]);
  const getViewport = useCallback(() => (
    gameRef.current?.getViewport?.() ?? { offsetX: 0, offsetY: 0 }
  ), [gameRef]);
  const initialViewport = React.useMemo(() => getViewport(), [getViewport]);
  // Use previous cellSize or fallback to 8 if undefined
  const cellSize = viewportSnapshot.cellSize || 8;
  const getLiveCells = useCallback(() => (
    gameRef.current?.getLiveCells?.() ?? new Map()
  ), [gameRef]);
  const setCellAlive = useCallback((x, y, alive) => {
    gameRef.current?.setCellAlive?.(x, y, alive);
  }, [gameRef]);
  // drawWithOverlay delegates to the GameMVC controller to request a render
  const drawWithOverlay = useCallback(() => {
    try {
      gameRef.current?.controller?.requestRender?.();
    } catch (e) {
      // Log render errors instead of silently ignoring them so issues are visible.
      // eslint-disable-next-line no-console
      console.error('drawWithOverlay error:', e);
    }
  }, [gameRef]);

  // Canvas DOM ref (used by GameUILayout). The single renderer (GameMVC)
  // will be instantiated when this ref's element is available.
  
  // Engine switching functions
  const startNormalMode = useCallback(() => {
    setEngineMode('normal');
    // Set engine mode on model
    if (gameRef.current?.model?.setEngineMode) {
      gameRef.current.model.setEngineMode('normal');
    }
    setIsRunningCombined(true, 'normal');
  }, [setIsRunningCombined]);
  
  const startHashlifeMode = useCallback(() => {
    // Hashlife mode is currently disabled in the UI.
    console.warn('Hashlife engine is temporarily disabled');
  }, []);
  
  const stopAllEngines = useCallback(() => {
    setIsRunningCombined(false);
  }, [setIsRunningCombined]);

  // Simple engine mode setter for dropdown
  const setEngineModeDirect = useCallback(() => {
    // Engine mode selection is disabled; always use normal engine.
  }, []);

  // Sync generation batch size with GameModel
  useEffect(() => {
    if (gameRef.current?.model?.setGenerationBatchSize) {
      gameRef.current.model.setGenerationBatchSize(generationBatchSize);
    }
  }, [generationBatchSize]);

  // React-side reset when session is cleared
  useEffect(() => {
    const handleSessionCleared = () => {
      setPopulationHistory([]);
      popHistoryRef.current = [];
      setSteadyInfo(INITIAL_STEADY_INFO);
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('gol:sessionCleared', handleSessionCleared);
    }

    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('gol:sessionCleared', handleSessionCleared);
      }
    };
  }, []);

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
      // eslint-disable-next-line no-console
      console.error('Failed to sync stability settings with GameMVC:', err);
    }
  }, [popWindowSize, popTolerance]);

  useEffect(() => {
    if (!gameRef.current?.setPerformanceSettings) return;
    try {
      gameRef.current.setPerformanceSettings({
        useWebWorker: useWebWorker,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to sync useWebWorker settings with GameMVC:', err);
    }
  }, [useWebWorker]);

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
      // eslint-disable-next-line no-console
      console.error('Failed to sync performance caps with GameMVC:', err);
    }
  }, [performanceCaps.maxFPS, performanceCaps.maxGPS, performanceCaps.enableFPSCap, performanceCaps.enableGPSCap]);

  const setShowChart = useCallback((open) => {
    setUIState(prev => ({ ...prev, showChart: open }));
  }, []);

  // Global keyboard shortcuts for UI actions (ADA compliance)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't handle shortcuts when typing in input fields
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Prevent default for handled shortcuts
      let handled = false;

      // Dialog shortcuts
      if (key === 'p' && !ctrl) {
        setUIState(prev => ({ ...prev, paletteOpen: true }));
        handled = true;
      } else if (key === 'o' && !ctrl) {
        setUIState(prev => ({ ...prev, optionsOpen: true }));
        handled = true;
      } else if (key === '?' || (e.shiftKey && key === '/')) {
        setUIState(prev => ({ ...prev, helpOpen: true }));
        handled = true;
      } else if (key === 'g' && !ctrl) {
        setUIState(prev => ({ ...prev, showChart: !prev.showChart }));
        handled = true;
      } else if (key === 'h' && !ctrl) {
        setUIState(prev => ({ ...prev, showChrome: !(prev?.showChrome ?? true) }));
        handled = true;
      } else if (key === 't' && !ctrl) {
        // Cycle color schemes
        const schemes = Object.keys(colorSchemes);
        const currentIndex = schemes.indexOf(uiState.colorSchemeKey || 'bio');
        const nextIndex = e.shiftKey 
          ? (currentIndex - 1 + schemes.length) % schemes.length 
          : (currentIndex + 1) % schemes.length;
        const safeKey = schemes[nextIndex] || 'bio';
        setUIState(prev => ({ ...prev, colorSchemeKey: safeKey }));
        // Also update color scheme in renderer
        try {
          const scheme = getColorSchemeFromKey(safeKey);
          gameRef.current?.setColorScheme?.(scheme);
        } catch (e) {
          // ignore failures to push color scheme to renderer
        }
        handled = true;
      } else if (key === 's' && ctrl) {
        // Ctrl+S - Save grid
        e.preventDefault();
        setUIState(prev => ({ ...prev, saveDialogOpen: true }));
        handled = true;
      } else if (key === 'l' && ctrl) {
        // Ctrl+L - Load grid
        setUIState(prev => ({ ...prev, loadDialogOpen: true }));
        handled = true;
      }

      if (handled) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [uiState]);

  const setShowSpeedGauge = useCallback((value) => {
    setUIState(prev => {
      try { globalThis.localStorage?.setItem('showSpeedGauge', JSON.stringify(value)); } catch (e) {}
      return { ...prev, showSpeedGauge: value };
    });
  }, []);

  const setDetectStablePopulationPreference = useCallback((value) => {
    setDetectStablePopulation(value);
    try { globalThis.localStorage?.setItem('detectStablePopulation', JSON.stringify(value)); } catch (e) {}
  }, []);

  const setColorSchemeKey = useCallback((key) => {
    const safeKey = key || 'bio';
    setUIState((prev) => ({ ...prev, colorSchemeKey: safeKey }));
    try { globalThis.localStorage?.setItem('colorSchemeKey', safeKey); } catch (e) {}
    try {
      const scheme = getColorSchemeFromKey(safeKey);
      gameRef.current?.setColorScheme?.(scheme);
    } catch (e) {
      // ignore failures to push color scheme to renderer
    }
  }, []);

  const setMaxFPS = useCallback((value) => {
    const clamped = Math.max(1, Math.min(120, Number(value) || 60));
    // Update preferred value (unaffected by ADA)
    // Removed unused preferredPerformance update
    // Recalculate effective caps (apply ADA limits if enabled)
    setPerformanceCaps((prev) => {
      let adaEnabled = true;
      try {
        const stored = globalThis.localStorage?.getItem('enableAdaCompliance');
        adaEnabled = stored === 'false' ? false : true;
      } catch {}
      const finalValue = adaEnabled ? 2 : clamped;
      return { ...prev, maxFPS: finalValue };
    });
  }, []);

  const setMaxGPS = useCallback((value) => {
    const clamped = Math.max(1, Math.min(60, Number(value) || 30));
    // Update preferred value (unaffected by ADA)
    // Removed unused preferredPerformance update
    // Recalculate effective caps (apply ADA limits if enabled)
    setPerformanceCaps((prev) => {
      let adaEnabled = true;
      try {
        const stored = globalThis.localStorage?.getItem('enableAdaCompliance');
        adaEnabled = stored === 'false' ? false : true;
      } catch {}
      const finalValue = adaEnabled ? 2 : clamped;
      return { ...prev, maxGPS: finalValue };
    });
  }, []);

  const setEnableFPSCap = useCallback((value) => {
    setPerformanceCaps((prev) => {
      const next = { ...prev, enableFPSCap: value };
      try { globalThis.localStorage?.setItem('enableFPSCap', JSON.stringify(value)); } catch (e) {}
      return next;
    });
  }, []);

  const setEnableGPSCap = useCallback((value) => {
    setPerformanceCaps((prev) => {
      const next = { ...prev, enableGPSCap: value };
      try { globalThis.localStorage?.setItem('enableGPSCap', JSON.stringify(value)); } catch (e) {}
      return next;
    });
  }, []);

  const setEnableAdaComplianceWithUpdate = useCallback((value) => {
    const newValue = Boolean(value);
    setEnableAdaCompliance(newValue);
    
    // Update colorSchemeKey based on ADA mode
    const newColorScheme = newValue ? 'adaSafe' : 'bio';
    setColorSchemeKey(newColorScheme);
    try {
      globalThis.localStorage?.setItem('colorSchemeKey', newColorScheme);
    } catch (e) {}
    
    // Update performance caps based on ADA mode: use preferred values, apply ADA caps if enabled
    setPerformanceCaps((prev) => {
      // Read preferred values from storage (they were saved independently)
      let prefMaxFPS = 60, prefMaxGPS = 30, prefEnableFPSCap = false, prefEnableGPSCap = false;
      try {
        const storedFPS = Number.parseInt(globalThis.localStorage?.getItem('maxFPS'), 10);
        const storedGPS = Number.parseInt(globalThis.localStorage?.getItem('maxGPS'), 10);
        const storedEnableFPS = globalThis.localStorage?.getItem('enableFPSCap');
        const storedEnableGPS = globalThis.localStorage?.getItem('enableGPSCap');
        if (Number.isFinite(storedFPS) && storedFPS > 0) prefMaxFPS = Math.max(1, Math.min(120, storedFPS));
        if (Number.isFinite(storedGPS) && storedGPS > 0) prefMaxGPS = Math.max(1, Math.min(60, storedGPS));
        if (storedEnableFPS) prefEnableFPSCap = JSON.parse(storedEnableFPS);
        if (storedEnableGPS) prefEnableGPSCap = JSON.parse(storedEnableGPS);
      } catch (e) {}
      
      // Apply ADA caps if enabled, otherwise use preferred
      const newCaps = {
        maxFPS: newValue ? 2 : prefMaxFPS,
        maxGPS: newValue ? 2 : prefMaxGPS,
        enableFPSCap: newValue ? true : prefEnableFPSCap,
        enableGPSCap: newValue ? true : prefEnableGPSCap,
      };
      return newCaps;
    });
    
    // Save to localStorage
    try {
      globalThis.localStorage?.setItem('enableAdaCompliance', JSON.stringify(newValue));
    } catch (e) {}

    // Broadcast a global event so non-React listeners can react immediately
    try {
      // Read current preferred caps to report
      let prefMaxFPS = 60, prefMaxGPS = 30, prefEnableFPSCap = false, prefEnableGPSCap = false;
      try {
        const storedFPS = Number.parseInt(globalThis.localStorage?.getItem('maxFPS'), 10);
        const storedGPS = Number.parseInt(globalThis.localStorage?.getItem('maxGPS'), 10);
        const storedEnableFPS = globalThis.localStorage?.getItem('enableFPSCap');
        const storedEnableGPS = globalThis.localStorage?.getItem('enableGPSCap');
        if (Number.isFinite(storedFPS) && storedFPS > 0) prefMaxFPS = Math.max(1, Math.min(120, storedFPS));
        if (Number.isFinite(storedGPS) && storedGPS > 0) prefMaxGPS = Math.max(1, Math.min(60, storedGPS));
        if (storedEnableFPS) prefEnableFPSCap = JSON.parse(storedEnableFPS);
        if (storedEnableGPS) prefEnableGPSCap = JSON.parse(storedEnableGPS);
      } catch (e) {}
      
      const computedCaps = {
        maxFPS: newValue ? 2 : prefMaxFPS,
        maxGPS: newValue ? 2 : prefMaxGPS,
        enableFPSCap: newValue ? true : prefEnableFPSCap,
        enableGPSCap: newValue ? true : prefEnableGPSCap,
      };
      globalThis.window?.dispatchEvent(
        new CustomEvent('gol:adaChanged', {
          detail: { enabled: newValue, colorScheme: newColorScheme, performanceCaps: computedCaps }
        })
      );
    } catch (e) {}
    
    // Trigger canvas resize to apply viewport changes (160px for ADA, full screen otherwise)
    // The canvas CSS style changes in GameUILayout, so we need to notify the renderer
    try {
      const canvas = canvasRef?.current;
      if (canvas) {
        // Force a layout recalculation by triggering a resize event
        // The ResizeObserver in useCanvasManager will detect this and recalculate viewport
        const resizeEvent = new Event('resize', { bubbles: true });
        globalThis.window?.dispatchEvent(resizeEvent);
        
        // Also trigger a direct canvas rect update after a frame to ensure layout is complete
        requestAnimationFrame(() => {
          if (gameRef?.current?.renderer?.resize) {
            try {
              const rect = canvas.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) {
                gameRef.current.renderer.resize(Math.floor(rect.width), Math.floor(rect.height));
              }
            } catch (e) {
              // ignore resize errors
            }
          }
        });
      }
    } catch (e) {
      // ignore viewport update errors
    }
  }, [setColorSchemeKey]);


  const setCaptureDialogOpen = useCallback((open) => {
    setUIState((prev) => ({ ...prev, captureDialogOpen: open }));
  }, []);

  const setMyShapesDialogOpen = useCallback((open) => {
    setUIState((prev) => ({ ...prev, myShapesDialogOpen: open }));
  }, []);

  const setImportDialogOpen = useCallback((open) => {
    setUIState((prev) => ({ ...prev, importDialogOpen: open }));
  }, []);



  // Sync random rectangle percent into controller tool state as a probability (0..1)
  useEffect(() => {
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
              try { console.debug('[GameOfLifeApp] stability detected before any generations advanced; skipping auto-pause'); } catch (e) {}
            }
        } else if (!steady && modelPopHistory.length % 100 === 0) {
          // Still evolving log removed
        }
      } catch (err) {
        // eslint-disable-next-line no-console
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
          try { console.debug('[GameOfLifeApp] stable detected but either empty or no generations yet; skipping dialog'); } catch (e) {}
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
  }, [detectStablePopulation, popWindowSize, popTolerance, steadyInfo.steady, setIsRunningCombined]);

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
        const windowSize = Math.max(1, Number(maxChartGenerations) || 5000);
        const next = prev.length >= windowSize
          ? [...prev.slice(-(windowSize - 1)), entry]
          : [...prev, entry];
        popHistoryRef.current = next;
        setPopulationHistory(next);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('population sampling failed:', e);
      }
    };

    const intervalId = window.setInterval(sample, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [maxChartGenerations]);

  

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
    }
  }, [offsetRef]);
  // Keep a ref to the current color scheme key so the layout effect
  // doesn't need to capture uiState in its dependency array.
  const colorSchemeKeyRef = useRef(uiState?.colorSchemeKey || 'bio');
  useEffect(() => { colorSchemeKeyRef.current = uiState?.colorSchemeKey || 'bio'; }, [uiState?.colorSchemeKey]);

  // Start a controlled drag from the palette into the canvas. This sets the
  // selected shape/tool on the controller and updates controller toolState
  // as the pointer moves so the normal overlay preview code can render.
  const startPaletteDrag = useCallback((shape, startEvent, ghostEl) => {
    try {
      const controller = gameRef.current && gameRef.current.controller;
      const canvas = canvasRef.current;
      if (!controller || !canvas) return () => {};

      // Ensure selection and tool are set
      try { gameRef.current.setSelectedShape?.(shape); } catch (e) {}
      try { gameRef.current.setSelectedTool?.('shapes'); } catch (e) {}

      // compute initial cell and set tool state
      const getEffectiveCellSize = () => (offsetRef?.current?.cellSize || cellSize);
      const updateLastFromEvent = (ev) => {
        try {
          const pt = eventToCellFromCanvas(ev, canvas, offsetRef, getEffectiveCellSize());
          if (pt) {
            controller._setToolState({ selectedShapeData: shape, start: pt, last: pt, dragging: true }, { updateOverlay: true });
          }
        } catch (err) { /* swallow */ }
      };

      // Ghost element is invisible; canvas overlay provides visual feedback

      updateLastFromEvent(startEvent);

      const onMove = (ev) => updateLastFromEvent(ev);
      
      // Define handlers together in a way that avoids forward references
      const handlers = {};
      
      const cleanup = () => {
        try { document.removeEventListener('pointermove', onMove); } catch (e) {}
        try { document.removeEventListener('pointerup', handlers.onUp); } catch (e) {}
        try { document.removeEventListener('pointercancel', handlers.onCancel); } catch (e) {}
        try { controller._setToolState({ start: null, last: null, dragging: false }, { updateOverlay: true }); } catch (e) {}
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
              try { controller.model.placeShape(finalPt.x, finalPt.y, controller.model.getSelectedShape()); } catch (ee) {}
            }
          }
        } catch (e) {
          // ignore
        } finally {
          cleanup();
        }
      };
      
      handlers.onCancel = (ev) => {
        cleanup();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', handlers.onUp);
      document.addEventListener('pointercancel', handlers.onCancel);

      // return cleanup
      return cleanup;
    } catch (err) {
      return () => {};
    }
  }, [canvasRef, gameRef, offsetRef, cellSize]);
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay,
    // Pass a getter so the hook can access the model once GameMVC initializes
    model: () => (gameRef.current ? gameRef.current.model : null),
    setSelectedShape
  });

  // Preload shapes into IndexedDB on startup. Strategy can be configured
  // via window.GOL_PRELOAD_STRATEGY or REACT_APP_PRELOAD_SHAPES; default is 'background'.
  const preloadStrategy = (typeof window !== 'undefined' && window.GOL_PRELOAD_STRATEGY) || process.env.REACT_APP_PRELOAD_SHAPES || 'background';
  const { loading: shapesLoading, progress: shapesProgress, error: shapesError, ready: shapesReady, start: shapesStart } = useInitialShapeLoader({ strategy: preloadStrategy, autoStart: false });

  // Notification snackbar when shapes catalog becomes ready
  useEffect(() => {
    if (shapesReady) {
      setShapesNotifOpen(true);
    }
  }, [shapesReady]);

  // Login required snackbar
  useEffect(() => {
    const handleNeedLogin = (event) => {
      setLoginNotifMessage(event.detail?.message || 'Please login.');
      setLoginNotifOpen(true);
    };
    window.addEventListener('auth:needLogin', handleNeedLogin);
    return () => window.removeEventListener('auth:needLogin', handleNeedLogin);
  }, []);

  // track cursor using the canvas DOM element and push canonical cursor
  // updates into the model so the renderer can use a single source of truth
  const cursorRecomputeRef = useRef(null);
  const handleCursor = useCallback((pt) => {
    try { gameRef.current?.model?.setCursorPositionModel?.(pt); } catch (e) {}
  }, []);

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
        try { console.error('[GameOfLifeApp] overlay refresh error:', e); } catch (err) {}
      }
    };

    model.addObserver(observer);
    return () => model.removeObserver(observer);
  }, [cursorRecomputeRef]);

  // --- Handlers ---
  const handleSelectShape = useCallback(shape => {
    gameRef.current?.setSelectedShape?.(shape);
    shapeManager.selectShape(shape);
  }, [shapeManager]);

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
          try { shapeManager.selectShape(shape); } catch (e) {}
        } else if (idOrName && shapeManager && typeof shapeManager.selectShape === 'function') {
          // try to select by id or name if possible; selectShape will also add to recents
          try {
            // shapeManager may expose a shapes cache; try best-effort lookup
            const found = (shapeManager.shapes || []).find(s => String(s.id) === String(idOrName) || String(s.name) === String(idOrName));
            if (found) shapeManager.selectShape(found);
          } catch (e) {}
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
            } catch (err) {}
          }
        }
      } catch (err) { /* swallow */ }
    };

    const onCapture = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const shape = detail.shape || detail;
        if (shape) {
          try { handleAddRecent(shape); } catch (e) {}
        }
      } catch (err) {}
    };

    const onSelectTool = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : {};
        const tool = detail.tool || detail.toolName || detail;
        if (tool) {
          try { setSelectedTool(tool); } catch (e) {}
          try { gameRef.current?.setSelectedTool?.(tool); } catch (e) {}
        }
      } catch (err) {}
    };

    window.addEventListener('gol:script:placeShape', onPlace);
    window.addEventListener('gol:script:capture', onCapture);
    window.addEventListener('gol:script:selectTool', onSelectTool);
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
          window.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { error: 'engine not ready' } }));
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
          try { model.placeShape(centerX, centerY, { cells }); } catch (e) {}

          // step until steady or until maxSteps using unified helper
          let runUntil;
          try { ({ runUntilSteadyModel: runUntil } = require('../model/stepping/runUntil')); } catch (_) {}
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

        window.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { results } }));
      } catch (err) {
        try { window.dispatchEvent(new CustomEvent('gol:script:runResult', { detail: { error: String(err) } })); } catch (e) {}
      }
    };
    window.addEventListener('gol:script:runUntilSteady', onRunUntilSteady);
    // Live-step updates from ScriptPanel: apply current script cells to main grid
    const onScriptStep = (ev) => {
      const detail = ev && ev.detail ? ev.detail : {};
      const cells = detail.cells || detail;
      const model = gameRef.current && gameRef.current.model;
      if (!model) return;
      // Only load the provided cells; do not clear the grid automatically
      try {
        loadGridIntoGame(gameRef, cells);
      } catch (e) {
        try { window.dispatchEvent(new CustomEvent('gol:script:error', { detail: { error: 'Failed to load script cells into model: ' + String(e) } })); } catch (ee) {}
      }
    };
    window.addEventListener('gol:script:step', onScriptStep);
    return () => {
      window.removeEventListener('gol:script:placeShape', onPlace);
      window.removeEventListener('gol:script:capture', onCapture);
      window.removeEventListener('gol:script:selectTool', onSelectTool);
      window.removeEventListener('gol:script:runUntilSteady', onRunUntilSteady);
      window.removeEventListener('gol:script:step', onScriptStep);
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
        // eslint-disable-next-line no-console
        console.warn('handleRotateShape in-place failed, fallback to rotateAndApply', e);
        // fall through to default behavior
      }
    }
    rotateAndApply(gameRef, shapeManager, rotatedShape, index);
    if (typeof drawWithOverlay === 'function') drawWithOverlay();
  }, [drawWithOverlay, gameRef, shapeManager]);
  const toggleChrome = useCallback(() => {
    setUIState((prev) => {
      const nextShowChrome = !(prev?.showChrome ?? true);
      try { globalThis.localStorage?.setItem('showChrome', JSON.stringify(nextShowChrome)); } catch (e) {}
      return { ...prev, showChrome: nextShowChrome };
    });
  }, []);
  const step = useCallback(async () => { 
    try {
      await gameRef.current?.step?.();
    } catch (error) {
      console.error('Step failed:', error);
    }
  }, []);
  const clear = useCallback(() => {
    try {
      // Cancel any in-flight hashlife work and clear its caches so it
      // cannot later re-populate the view after the UI model is cleared.
      try { hashlifeAdapter.cancel(); } catch (e) {}
      try { hashlifeAdapter.clearCache(); } catch (e) {}
    } catch (e) {
      // swallow
    }
    try { gameRef.current?.clear?.(); } catch (e) { console.error('gameRef.clear failed', e); }
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('gol:sessionCleared'));
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, []);
  // Running state management functions moved earlier
  const openPalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: true }));
  }, []);
  const closePalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: false }));
  }, []);

  // Protected save function for captured shapes
  const { wrappedAction: handleSaveCapturedShape, renderDialog: renderCaptureSaveDialog } = useProtectedAction(async (shapeData) => {
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
  });

  const handleLoadGrid = useCallback((liveCells) => {
    if (gameRef.current) {
      // Clear existing cells first so the loaded grid replaces the world
      try {
        if (typeof gameRef.current.clear === 'function') {
          gameRef.current.clear();
        }
      } catch (e) {
        // Log non-fatal errors when attempting to clear so issues are visible
        // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.warn('applyPendingLoad: mvc.clear threw an error', e);
        }
        // pending may be the raw liveCells (Map/array) or an object with .liveCells
  const toLoad = pending.liveCells === undefined ? pending : pending.liveCells;
        loadGridIntoGame(gameRef, toLoad);
      } catch (e) {
        // Log non-fatal initialization errors to aid debugging without breaking
        // runtime behavior. Do not rethrow to preserve current behavior.
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
          } else if (event === 'gameStep') {
            // Temporarily skip per-step populationHistory bookkeeping so we
            // can measure its impact on simulation performance. We keep
            // popHistoryRef stable, but avoid allocating new arrays or
            // calling getCellCount() on every generation.
          } else if (event === 'modelCleared' || event === 'gameCleared') {
            popHistoryRef.current = [];
            setPopulationHistory([]);
          } else if (event === 'stateImported') {
            try {
              const nextHistory = Array.isArray(data?.populationHistory)
                ? [...data.populationHistory]
                : (typeof model?.getPopulationHistory === 'function' ? model.getPopulationHistory() : []);
              popHistoryRef.current = nextHistory;
              setPopulationHistory(nextHistory);
            } catch (e) { /* ignore */ }
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
        };
        model.addObserver(observer);
        // Ensure we remove the observer when the MVC instance is destroyed
        // by capturing the observer reference in the mvc instance for cleanup.
        mvc._reactModelObserver = observer;
        // Also listen for captureCompleted events from the model so the
        // React UI can open the capture dialog when the user finishes a capture.
        const captureObserver = (event, data) => {
          try {
            if (event === 'captureCompleted' && data) {
              // Debug: trace that the React observer received the capture event
              try { console.debug('[GameOfLifeApp] captureObserver received captureCompleted', data); } catch (e) {}
              // Store capture data and open dialog in React UI
              setUIState(prev => ({ ...prev, captureData: data, captureDialogOpen: true }));
            }
          } catch (e) {
            // Log observer errors for diagnostics instead of silently ignoring them.
            // eslint-disable-next-line no-console
            console.error('captureObserver error:', e);
          }
        };
        model.addObserver(captureObserver);
        mvc._reactCaptureObserver = captureObserver;
      } catch (e) {
        // Non-fatal; continue initialization
        // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.error('Error destroying GameMVC instance during unmount:', e);
        }
        gameRef.current = null;
      }
    };
  }, [applyPendingLoad, syncOffsetFromMVC, applyInitialColorScheme, preloadStrategy, shapesLoading, shapesError, updateViewportSnapshot]);

  const setSelectedToolLocal = useCallback((tool) => {
      setSelectedTool(tool);
      try {
        gameRef.current?.setSelectedTool?.(tool);
      } catch (e) {
        console.error('Error setting selected tool on gameRef:', e);
      }
      // If the shapes tool is selected, open the palette in the UI so the
      // ShapePaletteDialog is shown. HeaderBar's ToolGroup doesn't itself
      // open the palette, so mirror that behavior here.
      if (tool === 'shapes') {
        try {
          openPalette();
        } catch (e) {
          console.error('Failed to open palette:', e);
        }
      }
    }, [openPalette]);

  // --- Controls props ---
  const colorScheme = getColorSchemeFromKey(uiState?.colorSchemeKey || 'bio');
  const controlsProps = useMemo(() => ({
    selectedTool,
    setSelectedTool: setSelectedToolLocal,
    onCenterViewport: () => gameRef.current?.centerOnLiveCells?.(),
    model: gameRef.current ? gameRef.current.model : null,
  colorSchemeKey: uiState?.colorSchemeKey || 'bio',
    setColorSchemeKey,
    colorSchemes,
    isRunning,
    setIsRunning: setIsRunningCombined,
    step,
  draw: drawWithOverlay,
    clear,
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
    openPalette,
    steadyInfo,
    toolStateRef,
    cursorCell,
    onLoadGrid: handleLoadGrid,
    showSpeedGauge: uiState?.showSpeedGauge ?? true,
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
    // Engine mode props
    engineMode,
    isHashlifeMode,
    onStartNormalMode: startNormalMode,
    onStartHashlifeMode: startHashlifeMode,
    onStopAllEngines: stopAllEngines,
    onSetEngineMode: setEngineModeDirect,
    // Hashlife batch size
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
    selectedTool, setSelectedToolLocal, uiState, setColorSchemeKey, isRunning, setIsRunningCombined,
    step, drawWithOverlay, clear, viewportSnapshot, setCellAlive, setShowChart, getLiveCells, popWindowSize,
    setPopWindowSize, popTolerance, setPopTolerance, handleSelectShape, openPalette, steadyInfo, handleLoadGrid,
    setShowSpeedGauge, detectStablePopulation, setDetectStablePopulationPreference, maxChartGenerations,
    setMaxChartGenerations, memoryTelemetryEnabled, setMemoryTelemetryEnabled, randomRectPercent,
    setRandomRectPercent, useHashlife, hashlifeMaxRun, hashlifeCacheSize, clearHashlifeCache, engineMode,
    startNormalMode, startHashlifeMode, stopAllEngines, setEngineModeDirect, generationBatchSize,
    setGenerationBatchSize, performanceCaps, setMaxFPS, setMaxGPS, setEnableFPSCap, setEnableGPSCap,
    enableAdaCompliance, setEnableAdaComplianceWithUpdate,
    handleAddRecent, generation, useWebWorker, setUseWebWorkerPreference, cursorCell, isHashlifeMode
  ]);

  // --- Render ---
  return (
    <>
  <LoadingShapesOverlay loading={shapesLoading} progress={shapesProgress} error={shapesError} onRetry={shapesStart} />
    <GameUILayout
      recentShapes={shapeManager.recentShapes}
        recentShapesPersistence={shapeManager.persistenceState}
        onSaveRecentShapes={shapeManager.persistRecentShapes}
        onClearRecentShapes={shapeManager.clearRecentShapes}
      onSelectShape={handleSelectShape}
  drawWithOverlay={drawWithOverlay}
      colorScheme={colorScheme}
      selectedShape={selectedShape}
      onRotateShape={handleRotateShape}
      onSwitchToShapesTool={() => gameRef.current?.setSelectedTool?.('shapes')}
      startPaletteDrag={startPaletteDrag}
      controlsProps={controlsProps}
      selectedTool={selectedTool}
    shapesReady={shapesReady}
      uiState={uiState}
      onClosePalette={closePalette}
      onPaletteSelect={(shape) => { gameRef.current?.setSelectedShape?.(shape); shapeManager.selectShapeAndClosePalette(shape); }}
      captureDialogOpen={uiState?.captureDialogOpen ?? false}
      onCloseCaptureDialog={() => setCaptureDialogOpen(false)}
      captureData={uiState.captureData}
      onSaveCapture={handleSaveCapturedShape}
      myShapesDialogOpen={uiState?.myShapesDialogOpen ?? false}
      onCloseMyShapesDialog={() => setMyShapesDialogOpen(false)}
      onOpenMyShapes={() => setMyShapesDialogOpen(true)}
      importDialogOpen={uiState?.importDialogOpen ?? false}
      onCloseImportDialog={() => setImportDialogOpen(false)}
      onOpenImportDialog={() => setImportDialogOpen(true)}
      onImportSuccess={(shape) => {
        // Refresh shapes or show message
        shapeManager.refreshShapes();
        // Could show snackbar here
      }}
  canvasRef={canvasRef}
      cursorCell={cursorCell}
      populationHistory={populationHistory}
      onCloseChart={() => setShowChart(false)}
      isRunning={isRunning}
      showSpeedGauge={uiState?.showSpeedGauge ?? true}
      onToggleSpeedGauge={setShowSpeedGauge}
      gameRef={gameRef}
      liveCellsCount={getLiveCells().size}
      // generation prop removed (was unused)
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      isSmall={isSmall}
      onToggleChrome={toggleChrome}
      enableAdaCompliance={enableAdaCompliance}
    />
      <Snackbar open={shapesNotifOpen} autoHideDuration={4000} onClose={() => setShapesNotifOpen(false)}>
        <Alert severity="success" onClose={() => setShapesNotifOpen(false)} sx={{ width: '100%' }}>
          Shapes catalog loaded
        </Alert>
      </Snackbar>
      <Snackbar open={loginNotifOpen} autoHideDuration={6000} onClose={() => setLoginNotifOpen(false)}>
        <Alert severity="info" onClose={() => setLoginNotifOpen(false)} sx={{ width: '100%' }}>
          {loginNotifMessage}
        </Alert>
      </Snackbar>
      {renderCaptureSaveDialog()}
      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)}>
        <DialogTitle>Duplicate Shape Detected</DialogTitle>
        <DialogContent>
          <p>A shape with the same pattern already exists in the catalog:</p>
          {duplicateShape && (
            <div>
              <strong>Name:</strong> {duplicateShape.name}<br />
              <strong>Description:</strong> {duplicateShape.description || 'No description'}<br />
              <strong>Cells:</strong> {duplicateShape.cellCount || 'Unknown'}
            </div>
          )}
          <p>Would you like to view the existing shape instead?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (duplicateShape) {
                shapeManager?.selectShape?.(duplicateShape);
                gameRef.current?.setSelectedTool?.('shapes');
              }
              setShowDuplicateDialog(false);
              setDuplicateShape(null);
            }}
            variant="contained"
          >
            View Existing Shape
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Stable Pattern Detection Dialog - Only show if detection is enabled */}
      <Dialog open={showStableDialog && detectStablePopulation} onClose={() => setShowStableDialog(false)}>
        <DialogTitle>🎉 Stable Pattern Detected!</DialogTitle>
        <DialogContent>
          {stableDetectionInfo && (
            <div>
              <p><strong>Pattern Type:</strong> {stableDetectionInfo.patternType}</p>
              <p><strong>Generation:</strong> {stableDetectionInfo.generation}</p>
              <p><strong>Population:</strong> {stableDetectionInfo.populationCount} cells</p>
              {stableDetectionInfo.period > 1 && (
                <p><strong>Period:</strong> {stableDetectionInfo.period}</p>
              )}
              <p>The simulation has been automatically paused. Would you like to continue running or keep it paused?</p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowStableDialog(false);
              setStableDetectionInfo(null);
              // Keep paused - ensure simulation stays stopped
              setIsRunningCombined(false);
            }}
          >
            Keep Paused
          </Button>
          <Button
            onClick={() => {
              setShowStableDialog(false);
              setStableDetectionInfo(null);
              // Reset notification flag so dialog can appear again if stability is re-detected
              userNotifiedRef.current = false;
              // Use single source of truth for running state
              setIsRunningCombined(true);
              
              // Force immediate stability recheck after a brief delay to allow state to settle
              setTimeout(() => {
                const mvc = gameRef.current;
                if (mvc && typeof mvc.isStable === 'function') {
                  // Trigger a manual check after user continues
                  console.log('🔄 Forcing stability recheck after continue...');
                }
              }, 100);
            }}
            variant="contained"
          >
            Continue Running
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Script Execution HUD */}
      <ScriptExecutionHUD enableAdaCompliance={enableAdaCompliance} />
      
      {/* First Load Warning Dialog - Shows only once per browser */}
      <FirstLoadWarningDialog 
        open={showFirstLoadWarning} 
        onClose={() => setShowFirstLoadWarning(false)}
      />
    </>
  );
}


GameOfLifeApp.propTypes = {
  initialUIState: PropTypes.object
};
export default GameOfLifeApp;
