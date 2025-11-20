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
import GameUILayout from './GameUILayout';
import './GameOfLife.css';
import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { GameMVC } from '../controller/GameMVC';
import { startMemoryLogger } from '../utils/memoryLogger';

// tools are registered by GameMVC.controller during initialization
function getColorSchemeFromKey(key) {
  const base = colorSchemes[key] || {};
  const copy = { ...base };
  if (typeof Object.freeze === 'function') Object.freeze(copy);
  return copy;
}

// The component has a slightly large body by necessity (many hooks/handlers).
// Disable the cognitive-complexity rule here to keep the implementation readable
// while we keep initialization logic small and well-factored above.
// Use the core 'complexity' rule name so ESLint doesn't require sonarjs plugin
// eslint-disable-next-line complexity
function GameOfLifeApp(props) {

  const defaultUIState = React.useMemo(() => ({
    showChart: false,
    showSpeedGauge: true,
    colorSchemeKey: 'bio',
    captureDialogOpen: false,
    paletteOpen: false,
    captureData: null,
    showChrome: true
  }), []);
  const [uiState, setUIState] = useState(props.initialUIState || defaultUIState);
  // Removed unused generation state
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [popWindowSize, setPopWindowSize] = useState(50);
  const [popTolerance, setPopTolerance] = useState(3);
  const [steadyInfo, setSteadyInfo] = useState({ steady: false, period: 0, popChanging: false });
  // persistent refs
  const snapshotsRef = useRef([]);
  const gameRef = useRef(null);
  const pendingLoadRef = useRef(null);
  const toolStateRef = useRef({});
  const isSmall = useMediaQuery('(max-width:900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isSmall);
  useEffect(() => { setSidebarOpen(!isSmall); }, [isSmall]);
  const getViewport = useCallback(() => (
    gameRef.current?.getViewport?.() ?? { offsetX: 0, offsetY: 0, cellSize: 8 }
  ), [gameRef]);
  const cellSize = getViewport().cellSize || 8;
  const getLiveCells = useCallback(() => (
    gameRef.current?.getLiveCells?.() ?? new Map()
  ), [gameRef]);
  const setCellAlive = useCallback((x, y, alive) => {
    gameRef.current?.setCellAlive?.(x, y, alive);
  }, [gameRef]);
  const colorScheme = React.useMemo(() => getColorSchemeFromKey(uiState?.colorSchemeKey || 'bio'), [uiState?.colorSchemeKey]);

  useEffect(() => {
    const stopLogger = startMemoryLogger({ label: 'GOL Memory' });
    return () => {
      stopLogger?.();
    };
  }, []);

  

  // Ensure offsetRef has the shape expected by canvas logic ({ x, y, cellSize })
  const offsetRef = useRef({
    x: getViewport().offsetX ?? 0,
    y: getViewport().offsetY ?? 0,
    cellSize: getViewport().cellSize ?? 8
  });
  // Keep a ref to the current color scheme key so the layout effect
  // doesn't need to capture uiState in its dependency array.
  const colorSchemeKeyRef = useRef(uiState?.colorSchemeKey || 'bio');
  useEffect(() => { colorSchemeKeyRef.current = uiState?.colorSchemeKey || 'bio'; }, [uiState?.colorSchemeKey]);
  // Canvas DOM ref (used by GameUILayout). The single renderer (GameMVC)
  // will be instantiated when this ref's element is available.
  const canvasRef = useRef(null);

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
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay,
    // Pass a getter so the hook can access the model once GameMVC initializes
    model: () => (gameRef.current ? gameRef.current.model : null)
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

  // track cursor using the canvas DOM element
  const cursorCell = useGridMousePosition({ canvasRef, cellSize });

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
        gridColor: scheme.gridColor || '#202020'
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
  const setMaxFPS = useCallback((maxFPS) => {
    gameRef.current?.setPerformanceSettings?.({ maxFPS });
  }, []);
  const setMaxGPS = useCallback((maxGPS) => {
    gameRef.current?.setPerformanceSettings?.({ maxGPS });
  }, []);
  const setCaptureDialogOpen = useCallback((open) => {
    setUIState(prev => ({ ...prev, captureDialogOpen: open }));
  }, []);
  const toggleChrome = useCallback(() => {
    setUIState(prev => ({ ...prev, showChrome: !(prev.showChrome ?? true) }));
  }, []);
  const step = useCallback(() => { gameRef.current?.step?.(); }, []);
  const clear = useCallback(() => { gameRef.current?.clear?.(); }, []);
  const setRunningState = useCallback((running) => {
    gameRef.current?.setRunning?.(running);
    setIsRunning(running);
  }, []);
  const openPalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: true }));
  }, []);
  const closePalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: false }));
  }, []);
  const handleSaveCapturedShape = useCallback(async (shapeData) => {
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
  }, [shapeManager]);
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
        offsetRef.current.x = vp.offsetX ?? offsetRef.current.x;
        offsetRef.current.y = vp.offsetY ?? offsetRef.current.y;
        // Only adopt the MVC-provided cellSize when the UI doesn't
        // already have a user-sized value. This avoids unexpectedly
        // jumping the zoom when the MVC has a different default (for
        // example stored session state) but the user already picked a
        // preferred zoom in the current session. We treat 8 as the
        // initial fallback cellSize (used before MVC exists) and only
        // overwrite it when MVC reports a value.
        const currentCellSize = offsetRef.current.cellSize;
        if (!currentCellSize || currentCellSize === 8) {
          offsetRef.current.cellSize = vp.cellSize ?? offsetRef.current.cellSize;
        }
      }
    }
  }, []);

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

      // Sync the React `selectedTool` state with the MVC model's selectedTool
      // so the ToolGroup reflects the current tool on initial load and when
      // the model updates (for example after importing state or restoring
      // from a saved session). We add a lightweight observer that updates
      // the React state when the model notifies a `selectedToolChanged`.
      try {
        const model = mvc.model;
        if (model && typeof model.getSelectedTool === 'function') {
          // Initialize local selection from model
          setSelectedTool(model.getSelectedTool());
        }
        const observer = (event, data) => {
          if (event === 'selectedToolChanged') {
            try { setSelectedTool(data); } catch (e) { /* ignore */ }
          }
        };
        model.addObserver(observer);
        // Ensure we remove the observer when the MVC instance is destroyed
        // by capturing the observer reference in the mvc instance for cleanup.
        mvc._reactSelectedToolObserver = observer;
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
            const obs = gameRef.current._reactSelectedToolObserver;
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
  }, [applyPendingLoad, syncOffsetFromMVC, applyInitialColorScheme, preloadStrategy, shapesLoading, shapesError]);

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
    setIsRunning: setRunningState,
    step,
  draw: drawWithOverlay,
    clear,
    snapshotsRef,
    setSteadyInfo,
    canvasRef,
    offsetRef,
    cellSize: getViewport().cellSize,
    setCellAlive,
    popHistoryRef: { current: (gameRef.current && typeof gameRef.current.getPopulationHistory === 'function') ? gameRef.current.getPopulationHistory() : [] },
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
    setMaxFPS,
    setMaxGPS,
  backendBase: resolveBackendBase(),
    onAddRecent: handleAddRecent
  };

  // --- Render ---
  return (
    <>
  <LoadingShapesOverlay loading={shapesLoading} progress={shapesProgress} error={shapesError} onRetry={shapesStart} />
    <GameUILayout
      recentShapes={shapeManager.recentShapes}
      onSelectShape={handleSelectShape}
  drawWithOverlay={drawWithOverlay}
      colorScheme={colorScheme}
      onRotateShape={handleRotateShape}
      onSwitchToShapesTool={() => gameRef.current?.setSelectedTool?.('shapes')}
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
  canvasRef={canvasRef}
      cursorCell={cursorCell}
      populationHistory={(gameRef.current && typeof gameRef.current.getPopulationHistory === 'function') ? gameRef.current.getPopulationHistory() : []}
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
    </>
  );
}


GameOfLifeApp.propTypes = {
  initialUIState: PropTypes.object
};
export default GameOfLifeApp;
