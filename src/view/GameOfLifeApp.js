import React, { useRef, useEffect, useCallback, useState } from 'react';
import SelectedToolIndicator from './SelectedToolIndicator';
import useCanvasManager from '../view/hooks/useCanvasManager';
import { GameMVC } from '../controller/GameMVC';
import ControlsBar from '../view/ControlsBar';
import PopulationChart from '../view/PopulationChart';
import ShapePaletteDialog from '../view/ShapePaletteDialog';
import CaptureShapeDialog from '../view/CaptureShapeDialog';
import RecentShapesStrip from '../view/RecentShapesStrip';
import SpeedGauge from '../view/SpeedGauge';
import { flushRandomRectBuffer, randomRectTool } from '../controller/tools/randomRectTool';
import { useShapeManager } from '../view/hooks/useShapeManager';
import { colorSchemes } from '../model/colorSchemes';
import isPopulationStable from '../controller/utils/populationUtils';
import logger from '../controller/utils/logger';
import '../view/GameOfLife.css';
import { drawTool } from '../controller/tools/drawTool';
import { lineTool } from '../controller/tools/lineTool';
import { rectTool } from '../controller/tools/rectTool';
import { circleTool } from '../controller/tools/circleTool';
import { ovalTool } from '../controller/tools/ovalTool';
import { shapesTool } from '../controller/tools/shapesTool';
import { captureTool } from '../controller/tools/captureTool';
import useGridMousePosition from './hooks/useGridMousePosition';
import PropTypes from 'prop-types';

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
// Constants
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;

function getColorSchemeFromKey(key) {
  const base = colorSchemes[key] || {};
  const copy = { ...base };
  if (typeof Object.freeze === 'function') Object.freeze(copy);
  return copy;
}

// Custom hooks extracted to reduce cognitive complexity in the main component
function useGameMvcInit({ canvasRef, gameRef, colorScheme, onModelReady, handleModelChange }) {
  // NOTE: intentionally one-time init; depends only on canvasRef.current existence
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return;
    const canvas = canvasRef.current;
    try {
      const options = { view: { showCursor: true, colorScheme } };
      const game = new GameMVC(canvas, options);
      gameRef.current = game;
      game.onModelChange((event, data) => handleModelChange(event, data, game));
      game.waitForTools().then(() => {
        if (typeof onModelReady === 'function') onModelReady(game);
      });
    } catch (error) {
      logger.error('❌ Failed to create MVC Game System:', error);
    }
    return () => { if (gameRef.current) gameRef.current = null; };
  }, [canvasRef, gameRef, colorScheme, handleModelChange, onModelReady]);
}

function useColorSchemeSync({ gameRef, colorScheme, colorSchemeKey }) {
  useEffect(() => {
    const key = colorSchemeKey || 'spectrum';
    logger.info('[GameOfLifeApp] useEffect colorSchemeKey:', key, colorScheme);
    if (!gameRef.current || !colorScheme) return;
    logger.info('🎨 Updating color scheme to:', key, colorScheme);
    gameRef.current.setColorScheme?.(colorScheme);
    gameRef.current.view?.renderer?.updateOptions?.({
      backgroundColor: colorScheme.background || colorScheme.backgroundColor || '#000000',
      gridColor: colorScheme.gridColor || '#202020'
    });
    gameRef.current.controller?.requestRender?.();
  }, [gameRef, colorScheme, colorSchemeKey]);
}

function useGameListenersSetup({ gameRef, updateStabilityDetection, handleModelChange }) {
  useEffect(() => {
    if (!gameRef.current) return;
    const game = gameRef.current;
    game.onModelChange((event, data) => handleModelChange(event, data, game));
    if (globalThis.speedGaugeTracker) {
      game.addPerformanceCallback((frameTime) => {
        globalThis.speedGaugeTracker(frameTime, frameTime);
      });
    }
  }, [gameRef, updateStabilityDetection, handleModelChange]);
}

function useAnimationFlushRandomRect({ gameRef, setCellAlive }) {
  useEffect(() => {
    let animationFrameId;
    function animationLoop() {
      if (gameRef.current?.randomRectBuffer) {
        const setCellsAliveBulk = (updates) => gameRef.current?.setCellsAliveBulk?.(updates);
        flushRandomRectBuffer({ _controller: gameRef.current }, setCellAlive, setCellsAliveBulk);
      } else if (gameRef.current?.toolState?.randomRectBuffer) {
        const setCellsAliveBulk = (updates) => gameRef.current?.setCellsAliveBulk?.(updates);
        flushRandomRectBuffer(gameRef.current.toolState, setCellAlive, setCellsAliveBulk);
      }
      animationFrameId = requestAnimationFrame(animationLoop);
    }
    animationFrameId = requestAnimationFrame(animationLoop);
    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  }, [gameRef, setCellAlive]);
}

// Small pure helpers to keep component logic flat
function rotateAndApply(gameRef, shapeManager, rotatedShape, index) {
  shapeManager.replaceRecentShapeAt?.(index, rotatedShape);
  if (gameRef.current?.setSelectedShape) {
    gameRef.current.setSelectedShape(rotatedShape);
    gameRef.current?.controller?.requestRender?.();
  } else {
    shapeManager.updateShapeState?.(rotatedShape);
  }
}

function clearGameAndReset(gameRef, setGeneration, steadyDetectedRef, setSteadyInfo) {
  setGeneration(0);
  steadyDetectedRef.current = false;
  setSteadyInfo({ steady: false, period: 0, popChanging: false });
  if (gameRef.current?.controller) {
    gameRef.current.controller.requestRender?.();
    const liveCells = gameRef.current.model.getLiveCells();
    const viewport = gameRef.current.model.getViewport();
    gameRef.current.view.render?.(liveCells, viewport);
  }
}

function loadGridIntoGame(gameRef, liveCells) {
  gameRef.current?.clear?.();
  if (liveCells?.size > 0) {
    for (const [key] of liveCells.entries()) {
      const [x, y] = key.split(',').map(Number);
      gameRef.current?.setCellAlive?.(x, y, true);
    }
    if (gameRef.current?.controller?.centerOnLiveCells) {
      gameRef.current.controller.centerOnLiveCells();
    } else {
      const lp = gameRef.current.model.getLiveCells();
      const vp = gameRef.current.model.getViewport();
      gameRef.current.view?.render?.(lp, vp);
    }
  }
}

function updateStabilityInfo(game, popWindowSize, popTolerance, steadyDetectedRef, setSteadyInfo) {
  const populationHistory = game.getPopulationHistory();
  const liveCells = game.getLiveCells();
  const popSteady = isPopulationStable(populationHistory, popWindowSize, popTolerance);
  const period = game.detectPeriod();
  const detected = popSteady || period > 0;
  setSteadyInfo({ steady: detected, period: period || (popSteady ? 1 : 0), popChanging: !popSteady });
  if (popSteady && !steadyDetectedRef.current && liveCells.size > 0) {
    steadyDetectedRef.current = true;
    game.setRunning(false);
  } else if (!popSteady) {
    steadyDetectedRef.current = false;
  }
}

// Backend API helper
async function saveCapturedShapeToBackend(shapeData) {
  const shapeForBackend = {
    ...shapeData,
    cells: shapeData.pattern,
    meta: { capturedAt: new Date().toISOString(), source: 'capture-tool' }
  };
  delete shapeForBackend.pattern;
  const response = await fetch('http://localhost:55000/v1/shapes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shapeForBackend)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  const savedShape = await response.json();
  logger.info('Shape saved successfully:', savedShape.name);
  return savedShape;
}

function useModelEventHandlers({
  setUIState,
  updateSelectedToolFromModel,
  updateSelectedShapeFromModel,
  handleGameStep,
  setIsRunning,
  setPerformanceSettings,
  handleGameCleared
}) {
  const eventHandlers = React.useMemo(() => ({
    selectedToolChanged: (data) => updateSelectedToolFromModel(data),
    selectedShapeChanged: (data) => updateSelectedShapeFromModel(data),
    gameStep: handleGameStep,
    runningStateChanged: (data) => setIsRunning(data.isRunning),
    performanceSettingsChanged: (data) => setPerformanceSettings(data),
    gameCleared: handleGameCleared,
    captureCompleted: (captureData) => {
      setUIState((prev) => ({ ...prev, captureData, captureDialogOpen: true }));
    }
  }), [
    handleGameStep,
    handleGameCleared,
    setUIState,
    setIsRunning,
    setPerformanceSettings,
    updateSelectedToolFromModel,
    updateSelectedShapeFromModel
  ]);

  const handleModelChange = useCallback((event, data, game) => {
    const handler = eventHandlers[event];
    if (handler) handler(data, game);
  }, [eventHandlers]);

  return { handleModelChange };
}

// Presentational components to reduce GameOfLifeApp render complexity
function SelectedToolBadge({ selectedTool }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000
    }}>
      <SelectedToolIndicator selectedTool={selectedTool} />
    </div>
  );
}
SelectedToolBadge.propTypes = {
  selectedTool: PropTypes.string
};

function RecentShapesPanel({ recentShapes, onSelectShape, drawWithOverlay, colorScheme, selectedShape, onRotateShape, onSwitchToShapesTool, openPalette }) {
  return (
    <div className="recent-shapes" style={{ width: 140, minWidth: 140, background: '#222', padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <RecentShapesStrip
        recentShapes={recentShapes}
        selectShape={onSelectShape}
        drawWithOverlay={drawWithOverlay}
        colorScheme={colorScheme}
        selectedShape={selectedShape}
        maxSlots={8}
        onRotateShape={onRotateShape}
        onSwitchToShapesTool={onSwitchToShapesTool}
        openPalette={openPalette}
      />
    </div>
  );
}
RecentShapesPanel.propTypes = {
  recentShapes: PropTypes.array,
  onSelectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  openPalette: PropTypes.func
};

function PalettePortal({ open, onClose, onSelectShape, backendBase, colorScheme }) {
  if (!open) return null;
  return (
    <ShapePaletteDialog
      open={open}
      onClose={onClose}
      onSelectShape={onSelectShape}
      backendBase={backendBase}
      colorScheme={colorScheme}
    />
  );
}
PalettePortal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSelectShape: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object
};

function CaptureDialogPortal({ open, onClose, captureData, onSave }) {
  if (!open) return null;
  return (
    <CaptureShapeDialog open={open} onClose={onClose} captureData={captureData} onSave={onSave} />
  );
}
CaptureDialogPortal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  captureData: PropTypes.object,
  onSave: PropTypes.func
};

// Keep tool overlay state in sync with current selections and recent shapes
function useToolStateSync({ shapeManager, selectedTool, selectedShape, toolStateRef, setRecentShapesState }) {
  useEffect(() => {
    setRecentShapesState(shapeManager.recentShapes);
    const ts = toolStateRef.current;
    if (!ts) return;
    if (selectedTool === 'shapes' && selectedShape) {
      ts.selectedShapeData = selectedShape;
      if (!ts.last || typeof ts.last.x !== 'number' || typeof ts.last.y !== 'number') {
        ts.last = { x: 0, y: 0 };
      }
    } else {
      ts.selectedShapeData = null;
    }
  }, [shapeManager.recentShapes, selectedShape, selectedTool, toolStateRef, setRecentShapesState]);
}

// Pure presentational layout extracted to reduce cognitive complexity in GameOfLifeApp
function GameUILayout({
  recentShapes,
  onSelectShape,
  drawWithOverlay,
  colorScheme,
  selectedShapeForPanel,
  onRotateShape,
  onSwitchToShapesTool,
  controlsProps,
  selectedTool,
  uiState,
  onClosePalette,
  onPaletteSelect,
  captureDialogOpen,
  onCloseCaptureDialog,
  captureData,
  onSaveCapture,
  canvasRef,
  cursorStyle,
  populationHistory,
  onCloseChart,
  isRunning,
  showSpeedGauge,
  onToggleSpeedGauge,
  gameRef
}) {
  return (
    <div className="canvas-container" style={{ display: 'flex', flexDirection: 'row', height: '100vh', backgroundColor: '#000' }}>
      <RecentShapesPanel
        recentShapes={recentShapes}
        onSelectShape={onSelectShape}
        drawWithOverlay={drawWithOverlay}
        colorScheme={colorScheme}
        selectedShape={selectedShapeForPanel}
        onRotateShape={onRotateShape}
        onSwitchToShapesTool={onSwitchToShapesTool}
        openPalette={controlsProps?.openPalette}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <ControlsBar {...controlsProps} />
          </div>
        </div>

        <SelectedToolBadge selectedTool={selectedTool} />

        <PalettePortal
          open={uiState?.paletteOpen ?? false}
          onClose={onClosePalette}
          onSelectShape={onPaletteSelect}
          backendBase={process.env.REACT_APP_BACKEND_BASE || 'http://localhost:55000'}
          colorScheme={colorSchemes ? (colorSchemes[uiState.colorSchemeKey] || {}) : {}}
        />

        <CaptureDialogPortal
          open={captureDialogOpen}
          onClose={onCloseCaptureDialog}
          captureData={captureData}
          onSave={onSaveCapture}
        />

        <canvas
          ref={canvasRef}
          style={{ cursor: cursorStyle, display: 'block', width: '100%', height: '100%', backgroundColor: '#000' }}
        />

        {(uiState?.showChart ?? false) && (
          <PopulationChart
            history={populationHistory}
            onClose={onCloseChart}
            isRunning={isRunning}
          />
        )}

        <SpeedGauge
          isVisible={showSpeedGauge}
          gameRef={gameRef}
          onToggleVisibility={onToggleSpeedGauge}
          position={{ top: 10, right: 10 }}
        />
      </div>
    </div>
  );
}
GameUILayout.propTypes = {
  recentShapes: PropTypes.array,
  onSelectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShapeForPanel: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  controlsProps: PropTypes.object,
  selectedTool: PropTypes.string,
  uiState: PropTypes.object,
  onClosePalette: PropTypes.func,
  onPaletteSelect: PropTypes.func,
  captureDialogOpen: PropTypes.bool,
  onCloseCaptureDialog: PropTypes.func,
  captureData: PropTypes.object,
  onSaveCapture: PropTypes.func,
  canvasRef: PropTypes.object,
  cursorStyle: PropTypes.string,
  populationHistory: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  onCloseChart: PropTypes.func,
  isRunning: PropTypes.bool,
  showSpeedGauge: PropTypes.bool,
  onToggleSpeedGauge: PropTypes.func,
  gameRef: PropTypes.object
};
function GameOfLifeApp(props) {

  // UI state managed locally in React
  const defaultUIState = React.useMemo(() => ({
    showChart: false,
    showSpeedGauge: true,
    colorSchemeKey: 'spectrum',
    captureDialogOpen: false,
    paletteOpen: false,
    captureData: null
  }), []);

  // We no longer remount the canvas on color scheme changes to preserve GameView listeners
  const [uiState, setUIState] = useState(props.initialUIState || defaultUIState);

  // UI state hooks and refs
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  /* eslint-disable react-hooks/exhaustive-deps */
  // We intentionally run this once to avoid re-creating MVC on color scheme or UI changes.
  useEffect(() => {
    logger.info('[GameOfLifeApp] isRunning state changed:', isRunning);
  }, [isRunning]);
  // Tool and shape selection are now tracked exclusively in the model
  const [selectedTool, setSelectedTool] = useState(null); // Used only for forced re-render
  const [selectedShape, setSelectedShape] = useState(null); // Used only for forced re-render
  
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const toolStateRef = useRef({});
  const [recentShapesState, setRecentShapesState] = useState([]);
  const getViewport = useCallback(() => (
    gameRef.current?.getViewport?.() ?? { offsetX: 0, offsetY: 0, cellSize: 8 }
  ), 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const cellSize = getViewport().cellSize || 8;
  const cursorCell = useGridMousePosition({ canvasRef, cellSize });

  // Strategic overlay sync and logging is handled in useShapeManager

  // Helper functions and variables needed for canvasManager
  // getViewport already defined above

  const getLiveCells = useCallback(() => (
    gameRef.current?.getLiveCells?.() ?? new Map()
  ), []);

  const setCellAlive = useCallback((x, y, alive) => {
    gameRef.current?.setCellAlive?.(x, y, alive);
  }, []);

  const colorScheme = React.useMemo(() => getColorSchemeFromKey(uiState?.colorSchemeKey || 'spectrum'), [uiState?.colorSchemeKey]);

  // Canvas manager must be defined before useShapeManager
  const canvasManager = useCanvasManager({
    getLiveCells,
    cellSize: getViewport().cellSize,
    offsetRef: { current: getViewport() },
    colorScheme,
    selectedTool,
    toolMap,
    toolStateRef,
    setCellAlive,
    selectedShape,
    placeShape: () => {},
    logger
  });

  // Shape management (initialized after canvasManager is available)
  // Move this above any usage to avoid no-use-before-define warning
  const shapeManager = useShapeManager({
    toolStateRef,
    drawWithOverlay: canvasManager?.drawWithOverlay,
    model: gameRef.current ? gameRef.current.model : null
  });

  // Shared selectShape handler to avoid duplicate function bodies
  const handleSelectShape = useCallback(shape => {
    gameRef.current?.setSelectedShape?.(shape);
    shapeManager.selectShape(shape);
  }, [shapeManager]);
 

  useToolStateSync({ shapeManager, selectedTool, selectedShape, toolStateRef, setRecentShapesState });

  const handleRotateShape = useCallback((rotatedShape, index) => {
    rotateAndApply(gameRef, shapeManager, rotatedShape, index);
  }, [shapeManager]);

  // Helper: handle model change events - defined after updateStabilityDetection
  // const handleModelChange = ... (moved below)
  // Viewport helpers for legacy components
  // Callback to show/hide chart
  const setShowChart = useCallback((show) => {
    setUIState(prev => ({ ...prev, showChart: show }));
  }, []);
  // Refs

  // Destructure props for useEffect dependencies
  const { onModelReady } = props;

  // ...existing code...

  // Population stability tracking
  const [popWindowSize, setPopWindowSize] = useState(DEFAULT_POPULATION_WINDOW_SIZE);
  const [popTolerance, setPopTolerance] = useState(DEFAULT_POPULATION_TOLERANCE);
  const [steadyInfo, setSteadyInfo] = useState({ steady: false, period: 0, popChanging: false });
  const steadyDetectedRef = useRef(false);

  // Use ref to store current values and avoid useCallback dependencies
  const popWindowSizeRef = useRef(popWindowSize);
  const popToleranceRef = useRef(popTolerance);

  // Helper to force re-render when model tool/shape changes
  const updateSelectedToolFromModel = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);
  const updateSelectedShapeFromModel = useCallback((shape) => {
    setSelectedShape(shape);
  }, []);

  // Performance tracking managed by model
  const [performanceSettings, setPerformanceSettings] = useState({
    maxFPS: 60,
    maxGPS: 30
  });

  // Color scheme
  // ...existing code...

  const updateStabilityDetection = useCallback((game) => {
    updateStabilityInfo(game, popWindowSizeRef.current, popToleranceRef.current, steadyDetectedRef, setSteadyInfo);
  }, []);

  // Event handler helpers - broken down for reduced complexity
  const handleGameStep = useCallback((data, game) => {
    setGeneration(data.generation);
    if (game) updateStabilityDetection(game);
  }, [updateStabilityDetection]);

  const handleGameCleared = useCallback(() => {
    clearGameAndReset(gameRef, setGeneration, steadyDetectedRef, setSteadyInfo);
  }, []);

  // Event mapping and handler (extracted)
  const { handleModelChange } = useModelEventHandlers({
    setUIState,
    updateSelectedToolFromModel,
    updateSelectedShapeFromModel,
    handleGameStep,
    setIsRunning,
    setPerformanceSettings,
    handleGameCleared
  });

  // MVC system initialization
  useGameMvcInit({ canvasRef, gameRef, colorScheme, onModelReady, handleModelChange });

  // Update color scheme in model when it changes
  useColorSchemeSync({ gameRef, colorScheme, colorSchemeKey: uiState?.colorSchemeKey });

  // Setup game event listeners and performance tracking
  useGameListenersSetup({ gameRef, updateStabilityDetection, handleModelChange });

  // UI State management functions
  const setColorSchemeKey = useCallback((key) => {
    // Update UI state
    setUIState(prev => ({ ...prev, colorSchemeKey: key }));
    // Apply immediately to the running MVC to avoid waiting for the effect tick
    try {
      const scheme = getColorSchemeFromKey(key || 'spectrum');
      if (gameRef.current?.setColorScheme) {
        gameRef.current.setColorScheme(scheme);
      }
      // Keep renderer options in sync so background/grid update promptly
      gameRef.current?.view?.renderer?.updateOptions?.({
        backgroundColor: scheme.background || scheme.backgroundColor || '#000000',
        gridColor: scheme.gridColor || '#202020'
      });
      gameRef.current?.controller?.requestRender?.();
    } catch (err) {
      logger.debug('Immediate color scheme apply failed:', err);
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

  // Component lifecycle tracking (removed no-op unmount effect)

  // Tool management
  // Tool selection and shape selection are managed exclusively in the model
  // ControlsBar and ToolStatus should use model getters/setters

  // Game controls
  const step = useCallback(() => { gameRef.current?.step?.(); }, []);

  const clear = useCallback(() => { gameRef.current?.clear?.(); }, []);

  const setRunningState = useCallback((running) => {
    logger.info('[GameOfLifeApp] setRunningState called:', running);
    gameRef.current?.setRunning?.(running);
    setIsRunning(running);
  }, []);


  // ...existing code...

  // Centralized palette management through model
  const openPalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: true }));
  }, []);

  const closePalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: false }));
  }, []);

  const handleSaveCapturedShape = useCallback((shapeData) => saveCapturedShapeToBackend(shapeData), []);

  // Grid loading
  const handleLoadGrid = useCallback((liveCells) => {
    loadGridIntoGame(gameRef, liveCells);
    logger.info(`Loaded grid with ${liveCells ? liveCells.size : 0} live cells`);
  }, []);



  // Animation loop: ONLY flush randomRect double buffer
  // Do not call gameRef.current.step() here; the controller runs the game loop.
  useAnimationFlushRandomRect({ gameRef, setCellAlive });

  const controlsProps = {
    selectedTool: selectedTool,
    setSelectedTool: (tool) => gameRef.current?.setSelectedTool?.(tool),
    onCenterViewport: () => gameRef.current?.centerOnLiveCells?.(),
    model: gameRef.current ? gameRef.current.model : null,
    colorSchemeKey: uiState?.colorSchemeKey || 'spectrum',
    setColorSchemeKey,
    colorSchemes,
    isRunning,
    setIsRunning: setRunningState,
    step,
    draw: canvasManager.drawWithOverlay,
    clear,
    generation,
    snapshotsRef: { current: [] },
    setSteadyInfo,
    canvasRef,
    offsetRef: { current: getViewport() },
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
    selectedShape: selectedShape,
    drawWithOverlay: canvasManager.drawWithOverlay,
    openPalette,
    steadyInfo,
    toolStateRef,
    cursorCell,
    onLoadGrid: handleLoadGrid,
    showSpeedGauge: uiState?.showSpeedGauge ?? true,
    setShowSpeedGauge,
    maxFPS: performanceSettings.maxFPS,
    setMaxFPS,
    maxGPS: performanceSettings.maxGPS,
    setMaxGPS
  };

  return (
    <GameUILayout
      recentShapes={recentShapesState}
      onSelectShape={handleSelectShape}
      drawWithOverlay={canvasManager.drawWithOverlay}
      colorScheme={colorScheme}
      selectedShapeForPanel={selectedShape}
      onRotateShape={handleRotateShape}
      onSwitchToShapesTool={() => gameRef.current?.setSelectedTool?.('shapes')}
      controlsProps={controlsProps}
      selectedTool={selectedTool}
      uiState={uiState}
      onClosePalette={() => closePalette()}
      onPaletteSelect={(shape) => { gameRef.current?.setSelectedShape?.(shape); shapeManager.selectShapeAndClosePalette(shape); }}
      captureDialogOpen={uiState?.captureDialogOpen ?? false}
      onCloseCaptureDialog={() => setCaptureDialogOpen(false)}
      captureData={uiState.captureData}
      onSaveCapture={handleSaveCapturedShape}
      canvasRef={canvasRef}
      cursorStyle={(selectedShape || selectedTool) ? 'crosshair' : 'default'}
      populationHistory={(gameRef.current && typeof gameRef.current.getPopulationHistory === 'function') ? gameRef.current.getPopulationHistory() : []}
      onCloseChart={() => setShowChart(false)}
      isRunning={isRunning}
      showSpeedGauge={uiState?.showSpeedGauge ?? true}
      onToggleSpeedGauge={setShowSpeedGauge}
      gameRef={gameRef}
    />
  );
}

GameOfLifeApp.propTypes = {
  onModelReady: PropTypes.func,
  initialUIState: PropTypes.object
};

export default GameOfLifeApp;
