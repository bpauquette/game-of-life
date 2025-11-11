import useMediaQuery from '@mui/material/useMediaQuery';
// canvas manager removed in favor of single MVC renderer
import { useShapeManager } from './hooks/useShapeManager';
import useGridMousePosition from './hooks/useGridMousePosition';
import { loadGridIntoGame, rotateAndApply } from './utils/gameUtils';
import { colorSchemes } from '../model/colorSchemes';
// tools are registered by GameMVC; no direct tool imports needed here
import { saveCapturedShapeToBackend } from '../utils/backendAPI';
import GameUILayout from './GameUILayout';
import './GameOfLife.css';
import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { GameMVC } from '../controller/GameMVC';

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
// eslint-disable-next-line sonarjs/cognitive-complexity
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
    try { gameRef.current?.controller?.requestRender?.(); } catch (e) { /* ignore */ }
  }, [gameRef]);
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay,
    model: gameRef.current ? gameRef.current.model : null
  });

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
  const handleRotateShape = useCallback((rotatedShape, index) => {
    // rotateAndApply is assumed to be imported or defined elsewhere
    rotateAndApply(gameRef, shapeManager, rotatedShape, index);
  }, [shapeManager]);
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
      try { gameRef.current.clear?.(); } catch (e) { /* ignore */ }
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
        try { mvc.clear?.(); } catch (e) { /* ignore */ }
        // pending may be the raw liveCells (Map/array) or an object with .liveCells
  const toLoad = pending.liveCells !== undefined ? pending.liveCells : pending;
        loadGridIntoGame(gameRef, toLoad);
      } catch (e) { /* swallow non-fatal */ }
      pendingLoadRef.current = null;
    }
  }, []);

  const syncOffsetFromMVC = useCallback((mvc) => {
    if (mvc && typeof mvc.getViewport === 'function') {
      const vp = mvc.getViewport();
      if (vp) {
        offsetRef.current.x = vp.offsetX ?? offsetRef.current.x;
        offsetRef.current.y = vp.offsetY ?? offsetRef.current.y;
        offsetRef.current.cellSize = vp.cellSize ?? offsetRef.current.cellSize;
      }
    }
  }, []);

  const applyInitialColorScheme = useCallback((mvc) => {
    try {
      const scheme = getColorSchemeFromKey(colorSchemeKeyRef.current || 'bio');
      mvc.setColorScheme?.(scheme);
      mvc.controller?.requestRender?.();
    } catch (e) { /* non-fatal */ }
  }, []);

  useLayoutEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return undefined;
    if (gameRef.current) return undefined; // already initialized

    try {
      const mvc = new GameMVC(canvasEl, {});
      gameRef.current = mvc;

      applyPendingLoad(mvc);
      syncOffsetFromMVC(mvc);
      applyInitialColorScheme(mvc);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize GameMVC:', err);
    }

    return () => {
      if (gameRef.current && typeof gameRef.current.destroy === 'function') {
        try { gameRef.current.destroy(); } catch (e) { /* ignore */ }
        gameRef.current = null;
      }
    };
  }, [applyPendingLoad, syncOffsetFromMVC, applyInitialColorScheme]);

  const setSelectedToolLocal = useCallback((tool) => {
      setSelectedTool(tool);
      try {
        gameRef.current?.setSelectedTool?.(tool);
      } catch (e) {
        console.error('Error setting selected tool on gameRef:', e);
      }
    }, []);

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
    backendBase: undefined, // Set if needed
    onAddRecent: handleAddRecent
  };

  // --- Render ---
  return (
    <GameUILayout
      onSelectShape={handleSelectShape}
  drawWithOverlay={drawWithOverlay}
      colorScheme={colorScheme}
      onRotateShape={handleRotateShape}
      onSwitchToShapesTool={() => gameRef.current?.setSelectedTool?.('shapes')}
      controlsProps={controlsProps}
      selectedTool={selectedTool}
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
  );
}


GameOfLifeApp.propTypes = {
  initialUIState: PropTypes.object
};
export default GameOfLifeApp;
