import useMediaQuery from '@mui/material/useMediaQuery';
// canvas manager removed in favor of single MVC renderer
import { useShapeManager } from './hooks/useShapeManager';
import useGridMousePosition from './hooks/useGridMousePosition';
import useInitialShapeLoader from '../hooks/useInitialShapeLoader';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LoadingShapesOverlay from './LoadingShapesOverlay';
import { loadGridIntoGame, rotateAndApply } from './utils/gameUtils';
import { colorSchemes } from '../model/colorSchemes';
// tools are registered by GameMVC; no direct tool imports needed here
import { saveCapturedShapeToBackend, resolveBackendBase } from '../utils/backendApi';
import { useProtectedAction } from '../auth/useProtectedAction';
import GameUILayout from './GameUILayout';
import './GameOfLife.css';
import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
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

  const defaultUIState = React.useMemo(() => ({
    showChart: false,
    showSpeedGauge: (() => { try { const v = globalThis.localStorage.getItem('showSpeedGauge'); return v == null ? true : JSON.parse(v); } catch { return true; } })(),
    colorSchemeKey: (() => { try { const v = globalThis.localStorage.getItem('colorSchemeKey'); return v || 'bio'; } catch { return 'bio'; } })(),
    captureDialogOpen: false,
    paletteOpen: false,
    myShapesDialogOpen: false,
    importDialogOpen: false,
    captureData: null,
    showChrome: true
  }), []);
  const [uiState, setUIState] = useState(props.initialUIState || defaultUIState);
  // Removed unused generation state
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(isRunning);
  const burstRunningRef = useRef(false);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [popWindowSize, setPopWindowSize] = useState(() => {
    // Clear old cached value to ensure new default takes effect
    try { 
      const v = globalThis.localStorage.getItem('popWindowSize'); 
      if (v != null) { 
        const n = Number.parseInt(v, 10); 
        // If cached value is the old default (50), use new default instead
        if (!Number.isNaN(n) && n > 0 && n !== 50) return n; 
      } 
    } catch {};
    return 10;  // Reduced from 50 to 10 for more responsive detection
  });
  const [popTolerance, setPopTolerance] = useState(() => {
    try { const v = globalThis.localStorage.getItem('popTolerance'); if (v != null) { const n = Number.parseInt(v, 10); if (!Number.isNaN(n) && n >= 0) return n; } } catch {};
    return 3;
  });
  const [maxChartGenerations, setMaxChartGenerations] = useState(5000);
  const [performanceCaps, setPerformanceCaps] = useState(() => {
    try {
      const maxFPS = Number.parseInt(globalThis.localStorage.getItem('maxFPS'), 10);
      const maxGPS = Number.parseInt(globalThis.localStorage.getItem('maxGPS'), 10);
      const enableFPSCap = globalThis.localStorage.getItem('enableFPSCap');
      const enableGPSCap = globalThis.localStorage.getItem('enableGPSCap');
      return {
        maxFPS: Number.isFinite(maxFPS) && maxFPS > 0 ? Math.max(1, Math.min(120, maxFPS)) : 60,
        maxGPS: Number.isFinite(maxGPS) && maxGPS > 0 ? Math.max(1, Math.min(60, maxGPS)) : 30,
        enableFPSCap: enableFPSCap != null ? JSON.parse(enableFPSCap) : false,
        enableGPSCap: enableGPSCap != null ? JSON.parse(enableGPSCap) : false
      };
    } catch (e) {
      return { maxFPS: 60, maxGPS: 30, enableFPSCap: false, enableGPSCap: false };
    }
  });
  const [detectStablePopulation, setDetectStablePopulation] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('detectStablePopulation');
      if (stored === 'true' || stored === 'false') return stored === 'true';
      if (stored != null) return Boolean(JSON.parse(stored));
      return true; // Enable by default for better user experience
    } catch {
      return true; // Enable by default for better user experience
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
  // Hashlife integration settings
  const [useHashlife, setUseHashlife] = useState(() => {
    try { const v = globalThis.localStorage.getItem('useHashlife'); return v == null ? true : v === 'true'; } catch { return true; }
  });
  const [hashlifeMaxRun, setHashlifeMaxRun] = useState(() => {
    try { const v = Number.parseInt(globalThis.localStorage.getItem('hashlifeMaxRun'), 10); return Number.isFinite(v) && v > 0 ? v : 1024; } catch { return 1024; }
  });
  const [hashlifeCacheSize, setHashlifeCacheSize] = useState(() => {
    try { const v = Number.parseInt(globalThis.localStorage.getItem('hashlifeCacheSize'), 10); return Number.isFinite(v) && v >= 0 ? v : 0; } catch { return 0; }
  });

  const clearHashlifeCache = useCallback(() => {
    try {
      hashlifeAdapter.clearCache();
      try { globalThis.console && console.debug('Hashlife cache cleared'); } catch (e) {}
    } catch (e) {
      try { console.error('Failed to clear hashlife cache', e); } catch (e2) {}
    }
  }, []);
  // persistent refs
  const snapshotsRef = useRef([]);
  const gameRef = useRef(null);
  const pendingLoadRef = useRef(null);
  const toolStateRef = useRef({});
  const popHistoryRef = useRef([]);
  useEffect(() => { popHistoryRef.current = populationHistory; }, [populationHistory]);
  const isSmall = useMediaQuery('(max-width:900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isSmall);
  useEffect(() => { setSidebarOpen(!isSmall); }, [isSmall]);
  const getViewport = useCallback(() => (
    gameRef.current?.getViewport?.() ?? { offsetX: 0, offsetY: 0 }
  ), [gameRef]);
  const initialViewport = React.useMemo(() => getViewport(), [getViewport]);
  const [viewportSnapshot, setViewportSnapshot] = useState(initialViewport);
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
  const handleHashlifeBurst = useCallback(async () => {
    if (!useHashlife) {
      try { console.warn('Hashlife is disabled'); } catch {}
      return;
    }
    // Render every N generations
    const RENDER_EVERY = 10;
    const total = Number(hashlifeMaxRun) || 1024;
    // Convert current live cells to array of {x,y}
    let cellsArr = [];
    try {
      const live = getLiveCells();
      if (live instanceof Map) {
        for (const key of live.keys()) {
          const [x, y] = String(key).split(',').map(Number);
          if (Number.isFinite(x) && Number.isFinite(y)) cellsArr.push({ x, y });
        }
      } else if (Array.isArray(live)) {
        cellsArr = live.map(c => (Array.isArray(c) ? { x: c[0], y: c[1] } : (c && typeof c === 'object' ? { x: c.x, y: c.y } : null))).filter(Boolean);
      } else if (live && typeof live.forEachCell === 'function') {
        live.forEachCell((x, y) => cellsArr.push({ x, y }));
      }
    } catch (e) {
      console.error('Failed to serialize live cells for hashlife burst', e);
      return;
    }

    if (!cellsArr.length) {
      try { console.info('No live cells to advance'); } catch {}
      return;
    }

    try {
      setIsRunning(true);
      burstRunningRef.current = true;
      let remaining = total;
      let current = cellsArr;
      try {
        // Diagnostic: report burst request and serialized cell count
        try { console.info('Hashlife burst requested', { useHashlife: !!useHashlife, cellCount: cellsArr.length, hashlifeMaxRun }); } catch (e) {}
      } catch (e) {}
      let progressedGenerations = 0;
      while (remaining > 0) {
        // Stop immediately if the user turned running off
        if (!isRunningRef.current) break;
        const step = Math.min(RENDER_EVERY, remaining);
        const res = await hashlifeAdapter.run(current, step, { cacheSize: hashlifeCacheSize });
        // If user pressed stop while the adapter was running, exit
        if (!isRunningRef.current) break;
        const nextCells = res && res.cells ? res.cells : [];
        // Apply to game (replace model state when possible so hashlife
        // results override the current world instead of merging on top).
        try {
          const model = gameRef.current?.model;
          if (model && typeof model.applyExternalStepResult === 'function') {
            try {
              model.applyExternalStepResult({ cells: nextCells, generations: step });
            } catch (inner) {
              console.error('Failed to applyExternalStepResult on model', inner);
              // fallback to additive load
              loadGridIntoGame(gameRef, nextCells);
            }
          } else {
            loadGridIntoGame(gameRef, nextCells);
          }
        } catch (e) {
          console.error('Failed to apply hashlife result to game', e);
        }
        // Log when we render
        try {
          progressedGenerations += step;
          if (progressedGenerations % RENDER_EVERY === 0) {
            try { console.info('render at generation', progressedGenerations); } catch (e) {}
          }
        } catch (e) {}
        try { drawWithOverlay(); } catch (e) { /* ignore */ }
        // prepare for next iteration
        current = nextCells.map(c => (Array.isArray(c) ? { x: c[0], y: c[1] } : { x: c.x, y: c.y }));
        remaining -= step;
        // Short pause to keep UI responsive (yield to browser)
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      console.error('Hashlife burst failed', err);
    } finally {
      burstRunningRef.current = false;
      setIsRunning(false);
    }
  }, [useHashlife, hashlifeMaxRun, hashlifeCacheSize, getLiveCells, drawWithOverlay, setIsRunning, gameRef]);
  const colorScheme = React.useMemo(() => getColorSchemeFromKey(uiState?.colorSchemeKey || 'bio'), [uiState?.colorSchemeKey]);
  useEffect(() => {
    // Listen for a global "session cleared" signal (emitted by RunControlGroup
    // when the user taps Clear grid) so we can reset React-side history and
    // steady-state UI without tightly coupling those components.
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
    // Forward hashlife progress messages from adapter/worker into main console
    try {
      // Only log progress at render intervals to avoid flooding the console.
      let _lastLogged = 0;
      const LOG_EVERY = 10;
      hashlifeAdapter.onProgress((payload) => {
        try {
          const gen = payload && payload.generation ? Number(payload.generation) : Number(payload || 0);
          if (Number.isFinite(gen) && gen > 0 && (gen % LOG_EVERY === 0) && gen !== _lastLogged) {
            _lastLogged = gen;
            try { console.info('Hashlife progress (render point)', gen); } catch (e) {}
          }
        } catch (e) {}
      });
    } catch (e) {}
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

  // If the user stops while a hashlife burst is active, request adapter cancellation
  useEffect(() => {
    if (!isRunning && burstRunningRef.current) {
      try {
        hashlifeAdapter.cancel();
      } catch (e) {
        try { console.warn('Failed to cancel hashlife adapter', e); } catch {}
      }
    }
  }, [isRunning]);

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
      console.log('🔧 Stability detection is DISABLED. Enable it in Options panel (gear icon) to use this feature.');
      setSteadyInfo((prev) => (prev === INITIAL_STEADY_INFO ? prev : INITIAL_STEADY_INFO));
      // Clear any existing dialog state when detection is disabled
      setShowStableDialog(false);
      setStableDetectionInfo(null);
      return;
    }
    console.log('✅ Stability detection is ENABLED');
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
          console.log(`🎉 STABILITY DETECTED! Gen: ${generation}, Population: ${modelPopHistory[modelPopHistory.length - 1]}, Period: ${period || 1}`);
          const recent = modelPopHistory.slice(-Math.min(5, modelPopHistory.length));
          console.log(`Final populations: [${recent.join(', ')}], Tolerance: ${popTolerance}`);
          
          // Always pause immediately when stability is detected
          console.log(`🔄 Auto-pausing simulation (stability detected)`);
          // Update both React state and game controller
          setIsRunning(false);
          try {
            gameRef.current?.setRunning?.(false);
          } catch (e) {
            console.error('Error pausing game controller:', e);
          }
        } else if (!steady && modelPopHistory.length % 50 === 0) {
          console.log(`🔍 Gen ${generation}: Still evolving... (${modelPopHistory.length} generations checked)`);
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
      
      setSteadyInfo((prev) => {
        // If we just became stable AND detection is enabled, show confirmation dialog
        if (!wasStable && nowStable && detectStablePopulation) {
          const populationCount = modelPopHistory[modelPopHistory.length - 1] || 0;
          const patternType = period === 0 ? 'Still Life' : period === 1 ? 'Still Life' : `Period ${period} Oscillator`;
          
          setStableDetectionInfo({
            generation,
            populationCount,
            patternType,
            period
          });
          setShowStableDialog(true);
        }
        
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
  }, [detectStablePopulation, popWindowSize, popTolerance, steadyInfo.steady]);

  // Memory telemetry is opt-in; when enabled we start the logger.
  useEffect(() => {
    if (!memoryTelemetryEnabled) {
      return undefined;
    }
    const base = resolveBackendBase() || '';
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
  // Canvas DOM ref (used by GameUILayout). The single renderer (GameMVC)
  // will be instantiated when this ref's element is available.
  const canvasRef = useRef(null);

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
      const updateLastFromEvent = (ev) => {
        try {
          const pt = eventToCellFromCanvas(ev, canvas, offsetRef, cellSize);
          if (pt) {
            controller._setToolState({ selectedShapeData: shape, start: pt, last: pt, dragging: true }, { updateOverlay: true });
          }
        } catch (err) { /* swallow */ }
      };

      // Ghost element is invisible; canvas overlay provides visual feedback

      updateLastFromEvent(startEvent);

      const onMove = (ev) => updateLastFromEvent(ev);
      const onUp = (ev) => {
        try {
          updateLastFromEvent(ev);
          const finalPt = eventToCellFromCanvas(ev, canvas, offsetRef, cellSize);
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
          try { controller._setToolState({ start: null, last: null, dragging: false }, { updateOverlay: true }); } catch (e) {}
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);

      // return cleanup
      return () => {
        try { document.removeEventListener('pointermove', onMove); } catch (e) {}
        try { document.removeEventListener('pointerup', onUp); } catch (e) {}
        try { controller._setToolState({ start: null, last: null, dragging: false }, { updateOverlay: true }); } catch (e) {}
      };
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
  const [shapesNotifOpen, setShapesNotifOpen] = useState(false);
  useEffect(() => {
    if (shapesReady) {
      setShapesNotifOpen(true);
    }
  }, [shapesReady]);

  // Login required snackbar
  const [loginNotifOpen, setLoginNotifOpen] = useState(false);
  const [loginNotifMessage, setLoginNotifMessage] = useState('');
  useEffect(() => {
    const handleNeedLogin = (event) => {
      setLoginNotifMessage(event.detail?.message || 'Please login.');
      setLoginNotifOpen(true);
    };
    window.addEventListener('auth:needLogin', handleNeedLogin);
    return () => window.removeEventListener('auth:needLogin', handleNeedLogin);
  }, []);

  // track cursor using the canvas DOM element
  const cursorCell = useGridMousePosition({ canvasRef, cellSize, offsetRef });

  // --- Handlers ---
  const handleSelectShape = useCallback(shape => {
    gameRef.current?.setSelectedShape?.(shape);
    shapeManager.selectShape(shape);
  }, [shapeManager]);
  const handleAddRecent = useCallback((shape) => {
    shapeManager.addRecentShape?.(shape);
  }, [shapeManager]);
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

    // Default: rotateAndApply selects and applies the rotated shape
    try {
      rotateAndApply(gameRef, shapeManager, rotatedShape, index);
    } catch (e) {
      // If rotateAndApply itself fails, log for diagnostics and avoid throwing.
      // eslint-disable-next-line no-console
      console.error('rotateAndApply failed in handleRotateShape:', e);
    }
  }, [shapeManager, drawWithOverlay]);
  const setShowChart = useCallback((show) => {
    setUIState(prev => ({ ...prev, showChart: show }));
  }, []);
   useEffect(() => {
        if (typeof drawWithOverlay === 'function') {
          drawWithOverlay();
        }
      }, [drawWithOverlay, getLiveCells, cellSize, colorScheme, selectedTool, uiState]);
  const setColorSchemeKey = useCallback((key) => {
    setUIState(prev => ({ ...prev, colorSchemeKey: key }));
    try {
  const scheme = getColorSchemeFromKey(key || 'bio');
      if (gameRef.current?.setColorScheme) {
        gameRef.current.setColorScheme(scheme);
      }
      gameRef.current?.view?.renderer?.updateOptions?.({
        backgroundColor: scheme.background || scheme.backgroundColor || '#000000',
        gridColor: scheme.gridColor
      });
      gameRef.current?.controller?.requestRender?.();
    } catch (err) {
      console.error('Error setting color scheme:', err);
    }
  }, []);
  const setShowSpeedGauge = useCallback((show) => {
    setUIState(prev => {
      if (prev.showSpeedGauge === show) return prev;
      return { ...prev, showSpeedGauge: show };
    });
  }, []);
  const setDetectStablePopulationPreference = useCallback((enabled) => {
    const next = !!enabled;
    setDetectStablePopulation(next);
    try {
      globalThis.localStorage?.setItem('detectStablePopulation', next ? 'true' : 'false');
    } catch {
      // ignore storage failures
    }
  }, []);
  const setMaxFPS = useCallback((maxFPS) => {
    let next = Number(maxFPS);
    if (!Number.isFinite(next)) {
      next = performanceCaps.maxFPS;
    }
    next = Math.max(1, Math.min(120, next));
    if (next === performanceCaps.maxFPS) return;
    setPerformanceCaps((prev) => ({ ...prev, maxFPS: next }));
    gameRef.current?.setPerformanceSettings?.({ maxFPS: next });
  }, [performanceCaps.maxFPS]);
  const setMaxGPS = useCallback((maxGPS) => {
    let next = Number(maxGPS);
    if (!Number.isFinite(next)) {
      next = performanceCaps.maxGPS;
    }
    next = Math.max(1, Math.min(60, next));
    if (next === performanceCaps.maxGPS) return;
    setPerformanceCaps((prev) => ({ ...prev, maxGPS: next }));
    gameRef.current?.setPerformanceSettings?.({ maxGPS: next });
  }, [performanceCaps.maxGPS]);
  const setEnableFPSCap = useCallback((enabled) => {
    const next = !!enabled;
    if (next === performanceCaps.enableFPSCap) return;
    setPerformanceCaps((prev) => ({ ...prev, enableFPSCap: next }));
    gameRef.current?.setPerformanceSettings?.({ enableFPSCap: next });
  }, [performanceCaps.enableFPSCap]);
  const setEnableGPSCap = useCallback((enabled) => {
    const next = !!enabled;
    if (next === performanceCaps.enableGPSCap) return;
    setPerformanceCaps((prev) => ({ ...prev, enableGPSCap: next }));
    gameRef.current?.setPerformanceSettings?.({ enableGPSCap: next });
  }, [performanceCaps.enableGPSCap]);
  const setCaptureDialogOpen = useCallback((open) => {
    setUIState(prev => ({ ...prev, captureDialogOpen: open }));
  }, []);
  const setMyShapesDialogOpen = useCallback((open) => {
    setUIState(prev => ({ ...prev, myShapesDialogOpen: open }));
  }, []);
  const setImportDialogOpen = useCallback((open) => {
    setUIState(prev => ({ ...prev, importDialogOpen: open }));
  }, []);
  const toggleChrome = useCallback(() => {
    setUIState(prev => ({ ...prev, showChrome: !(prev.showChrome ?? true) }));
  }, []);
  const step = useCallback(() => { gameRef.current?.step?.(); }, []);
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
  const setRunningState = useCallback((running) => {
    try {
      gameRef.current?.setRunning?.(running);
    } catch (e) {
      console.error('Error setting running state on gameRef:', e);
    }
  }, []);
  // Keep local React state and model running state in sync: some UI components
  // call `setIsRunning` while others call `setRunningState`. Provide a
  // combined setter that updates both so cancellation and ref checks work.
  const setIsRunningCombined = useCallback((running) => {
    try { setIsRunning(!!running); } catch (e) {}
    try { setRunningState(!!running); } catch (e) {}
  }, [setRunningState]);
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
  const controlsProps = {
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
    setUseHashlife,
    hashlifeMaxRun,
    setHashlifeMaxRun,
    hashlifeCacheSize,
    setHashlifeCacheSize,
    clearHashlifeCache,
    onHashlifeBurst: handleHashlifeBurst,
    maxFPS: performanceCaps.maxFPS,
    maxGPS: performanceCaps.maxGPS,
    enableFPSCap: performanceCaps.enableFPSCap,
    enableGPSCap: performanceCaps.enableGPSCap,
    setMaxFPS,
    setMaxGPS,
    setEnableFPSCap,
    setEnableGPSCap,
  backendBase: resolveBackendBase(),
    onAddRecent: handleAddRecent
  };

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
            }}
          >
            Keep Paused
          </Button>
          <Button
            onClick={() => {
              setShowStableDialog(false);
              setStableDetectionInfo(null);
              // Update both React state and game controller
              setIsRunning(true);
              try {
                gameRef.current?.setRunning?.(true);
              } catch (e) {
                console.error('Error resuming game controller:', e);
              }
            }}
            variant="contained"
          >
            Continue Running
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


GameOfLifeApp.propTypes = {
  initialUIState: PropTypes.object
};
export default GameOfLifeApp;
