import useMediaQuery from '@mui/material/useMediaQuery';
import useCanvasManager from './hooks/useCanvasManager';
import { useShapeManager } from './hooks/useShapeManager';
import useGridMousePosition from './hooks/useGridMousePosition';
import { loadGridIntoGame, rotateAndApply } from './utils/gameUtils';
import { colorSchemes } from '../model/colorSchemes';
import { drawTool } from '../controller/tools/drawTool';
import { lineTool } from '../controller/tools/lineTool';
import { rectTool } from '../controller/tools/rectTool';
import { circleTool } from '../controller/tools/circleTool';
import { ovalTool } from '../controller/tools/ovalTool';
import { shapesTool } from '../controller/tools/shapesTool';
import { captureTool } from '../controller/tools/captureTool';
import { randomRectTool } from '../controller/tools/randomRectTool';
import { saveCapturedShapeToBackend } from '../utils/backendAPI';
import GameUILayout from './GameUILayout';
import './GameOfLife.css';
import React, { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';

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

  const toolMap = {
    draw: drawTool,
    line: lineTool,
    rect: rectTool,
    circle: circleTool,
    oval: ovalTool,
    shapes: shapesTool,
    capture: captureTool,
    randomRect: randomRectTool
  };
  function getColorSchemeFromKey(key) {
    const base = colorSchemes[key] || {};
    const copy = { ...base };
    if (typeof Object.freeze === 'function') Object.freeze(copy);
    return copy;
  }

  // Ensure offsetRef has the shape expected by useCanvasManager ({ current: { x, y, cellSize } })
  const offsetRef = useRef({
    x: getViewport().offsetX ?? 0,
    y: getViewport().offsetY ?? 0,
    cellSize: getViewport().cellSize ?? 8
  });

  const canvasManager = useCanvasManager({
    getLiveCells,
    cellSize: getViewport().cellSize,
    offsetRef,
    colorScheme,
    selectedTool,
    toolMap,
    toolStateRef,
    setCellAlive,
    placeShape: (x, y, shape) => gameRef.current?.placeShape?.(x, y, shape),
    logger: undefined // If you use logger, import it above
  });
  const canvasRef = canvasManager.canvasRef;
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay: canvasManager?.drawWithOverlay,
    model: gameRef.current ? gameRef.current.model : null
  });

  // track cursor using the canvas managed by canvasManager
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
        if (typeof canvasManager?.drawWithOverlay === 'function') {
          canvasManager.drawWithOverlay();
        }
      }, [canvasManager, getLiveCells, cellSize, colorScheme, selectedTool, uiState]);
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
    loadGridIntoGame(gameRef, liveCells);
  }, []);

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
    draw: canvasManager.drawWithOverlay,
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
    drawWithOverlay: canvasManager.drawWithOverlay,
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
      drawWithOverlay={canvasManager.drawWithOverlay}
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
