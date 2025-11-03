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
/* eslint-disable sonarjs/cognitive-complexity */
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
  const getViewport = useCallback(() => {
    if (gameRef.current && typeof gameRef.current.getViewport === 'function') {
      return gameRef.current.getViewport();
    }
    return { offsetX: 0, offsetY: 0, cellSize: 8 };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const cellSize = getViewport().cellSize || 8;
  const cursorCell = useGridMousePosition({ canvasRef, cellSize });

  // Strategic overlay sync and logging is handled in useShapeManager

  // Helper functions and variables needed for canvasManager
  // getViewport already defined above

  const getLiveCells = useCallback(() => {
    return gameRef.current ? gameRef.current.getLiveCells() : new Map();
  }, []);

  const setCellAlive = useCallback((x, y, alive) => {
    if (gameRef.current) {
      gameRef.current.setCellAlive(x, y, alive);
    }
  }, []);

  const colorScheme = React.useMemo(() => {
    const colorSchemeKey = uiState?.colorSchemeKey || 'spectrum';
    const base = colorSchemes[colorSchemeKey] || {};
    const copy = { ...base };
    if (typeof Object.freeze === 'function') {
      Object.freeze(copy);
    }
    return copy;
  }, [uiState?.colorSchemeKey]);

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
    // scheduleCursorUpdate removed: cursorCell is now tracked by useGridMousePosition
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
    if (gameRef.current && typeof gameRef.current.setSelectedShape === 'function') {
      gameRef.current.setSelectedShape(shape);
    }
    shapeManager.selectShape(shape);
  }, [shapeManager]);
 

  useEffect(() => {
    setRecentShapesState(shapeManager.recentShapes);
    // Always sync toolStateRef for overlays and placement
    if (toolStateRef.current) {
      if (selectedTool === 'shapes' && selectedShape) {
        toolStateRef.current.selectedShapeData = selectedShape;
        if (!toolStateRef.current.last || typeof toolStateRef.current.last.x !== 'number' || typeof toolStateRef.current.last.y !== 'number') {
          toolStateRef.current.last = { x: 0, y: 0 };
        }
      } else {
        toolStateRef.current.selectedShapeData = null;
      }
    }
  }, [shapeManager.recentShapes, selectedShape, selectedTool]);

  const handleRotateShape = useCallback((rotatedShape, index) => {
    // Update source-of-truth recent list in place
    if (typeof shapeManager.replaceRecentShapeAt === 'function') {
      shapeManager.replaceRecentShapeAt(index, rotatedShape);
    }
    // Ensure controller state updates so overlays refresh correctly
    if (gameRef.current && typeof gameRef.current.setSelectedShape === 'function') {
      gameRef.current.setSelectedShape(rotatedShape);
      // Force an immediate render so the overlay updates without waiting
      if (gameRef.current.controller && typeof gameRef.current.controller.requestRender === 'function') {
        gameRef.current.controller.requestRender();
      }
    } else if (typeof shapeManager.updateShapeState === 'function') {
      // Fallback: update model/tool state via shapeManager
      shapeManager.updateShapeState(rotatedShape);
    }
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
    const populationHistory = game.getPopulationHistory();
    const liveCells = game.getLiveCells();

    // Population stability - use current ref values
    const popSteady = isPopulationStable(populationHistory, popWindowSizeRef.current, popToleranceRef.current);

    // Pattern period detection
    const period = game.detectPeriod();

    const detected = popSteady || period > 0;
    setSteadyInfo({
      steady: detected, period: period || (popSteady ? 1 : 0),
      popChanging: !popSteady
    });

    if (popSteady && !steadyDetectedRef.current && liveCells.size > 0) {
      steadyDetectedRef.current = true;
      game.setRunning(false);
    } else if (!popSteady) {
      steadyDetectedRef.current = false;
    }
  }, []); // No dependencies - use refs for current values

  // Event handler helpers - broken down for reduced complexity
  const handleGameStep = useCallback((data, game) => {
    setGeneration(data.generation);
    if (game) updateStabilityDetection(game);
  }, [updateStabilityDetection]);

  const handleGameCleared = useCallback(() => {
    setGeneration(0);
    steadyDetectedRef.current = false;
    setSteadyInfo({ steady: false, period: 0, popChanging: false });
    if (gameRef.current?.controller) {
      gameRef.current.controller.requestRender();
      // Force a direct render for safety (works even if game loop is stopped)
      const liveCells = gameRef.current.model.getLiveCells();
      const viewport = gameRef.current.model.getViewport();
      gameRef.current.view.render(liveCells, viewport);
    }
  }, []);

  // Event type to handler mapping
  const eventHandlers = React.useMemo(() => ({
    'selectedToolChanged': (data) => updateSelectedToolFromModel(data),
    'selectedShapeChanged': (data) => updateSelectedShapeFromModel(data),
    'gameStep': handleGameStep,
    'runningStateChanged': (data) => setIsRunning(data.isRunning),
    'performanceSettingsChanged': (data) => setPerformanceSettings(data),
    'gameCleared': handleGameCleared,
    // Open capture dialog when capture tool completes selection
    'captureCompleted': (captureData) => {
      setUIState(prev => ({
        ...prev,
        captureData,
        captureDialogOpen: true
      }));
    }
  }), [handleGameStep, handleGameCleared, updateSelectedToolFromModel, updateSelectedShapeFromModel]);

  // Helper: handle model change events
  const handleModelChange = useCallback((event, data, game) => {
    const handler = eventHandlers[event];
    if (handler) {
      handler(data, game);
    }
  }, [eventHandlers]);

  // Initialize MVC system once canvas is available
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    try {
      const options = {
        view: { showCursor: true, colorScheme }
      };
      const game = new GameMVC(canvas, options);
      gameRef.current = game;

      // Setup model observers to sync React state
      game.onModelChange((event, data) => handleModelChange(event, data, game));

      // Wait for all tools to load before enabling interactions
      game.waitForTools().then(() => {
        // Initialize React state from model
        updateSelectedToolFromModel(game.getSelectedTool());
        updateSelectedShapeFromModel(game.getSelectedShape());
        setGeneration(game.model.getGeneration());
        setIsRunning(game.model.getIsRunning());
        setPerformanceSettings(game.getPerformanceSettings());
        // Notify test code that model is ready
        if (typeof onModelReady === 'function') {
          onModelReady(game);
        }
      });

    } catch (error) {
      logger.error('❌ Failed to create MVC Game System:', error);
    }

    // Cleanup only on unmount. We intentionally avoid resetting gameRef on
    // colorScheme or other UI changes to prevent recreating the model.
    return () => {
      if (gameRef.current) {
        // Note: GameMVC doesn't have a destroy method yet
        gameRef.current = null;
      }
    };
  }, []);

  // Update color scheme in model when it changes
  useEffect(() => {
    const colorSchemeKey = uiState?.colorSchemeKey || 'spectrum';
    logger.info('[GameOfLifeApp] useEffect colorSchemeKey:', colorSchemeKey, colorScheme);
    if (gameRef.current && colorScheme) {
      logger.info('🎨 Updating color scheme to:', colorSchemeKey, colorScheme);
      // Set colorScheme in the model for rendering via GameMVC API
      if (typeof gameRef.current.setColorScheme === 'function') {
        gameRef.current.setColorScheme(colorScheme);
        logger.info('[GameOfLifeApp] Called setColorScheme on GameMVC');
      } else {
        logger.warn('[GameOfLifeApp] gameRef.current.setColorScheme is not a function');
      }
      // Update renderer background/grid colors
      if (gameRef.current?.view?.renderer) {
        gameRef.current.view.renderer.updateOptions({
          backgroundColor: colorScheme.background || colorScheme.backgroundColor || '#000000',
          gridColor: colorScheme.gridColor || '#202020'
        });
      }
      if (gameRef.current.controller && typeof gameRef.current.controller.requestRender === 'function') {
        gameRef.current.controller.requestRender();
      }
    }
  }, [colorScheme, uiState?.colorSchemeKey]); // Add missing dependency

  // Setup game event listeners (separate from game creation to avoid circular dependencies)
  useEffect(() => {
    if (!gameRef.current) return;

    const game = gameRef.current;

    // Setup game event listeners
    game.onModelChange((event, data) => handleModelChange(event, data, game));

    // Setup performance tracking
    if (globalThis.speedGaugeTracker) {
      game.addPerformanceCallback((frameTime) => {
        globalThis.speedGaugeTracker(frameTime, frameTime);
      });
    }

    return () => {
      // No cleanup needed for this effect
    };
  }, [updateStabilityDetection, handleModelChange]);

  // UI State management functions
  const setColorSchemeKey = useCallback((key) => {
    setUIState(prev => ({ ...prev, colorSchemeKey: key }));
  }, []);

  const setShowSpeedGauge = useCallback((show) => {
    setUIState(prev => {
      if (prev.showSpeedGauge === show) return prev;
      return { ...prev, showSpeedGauge: show };
    });
  }, []);

  const setMaxFPS = useCallback((maxFPS) => {
    if (gameRef.current) {
      gameRef.current.setPerformanceSettings({ maxFPS });
    }
  }, []);

  const setMaxGPS = useCallback((maxGPS) => {
    if (gameRef.current) {
      gameRef.current.setPerformanceSettings({ maxGPS });
    }
  }, []);

  const setCaptureDialogOpen = useCallback((open) => {
    setUIState(prev => ({ ...prev, captureDialogOpen: open }));
  }, []);

  // Component lifecycle tracking
  useEffect(() => {
    return () => {
      // Component unmounting
    };
  }, []);

  // Tool management
  // Tool selection and shape selection are managed exclusively in the model
  // ControlsBar and ToolStatus should use model getters/setters

  // Game controls
  const step = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.step();
    }
  }, []);

  const clear = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.clear();
    }
  }, []);

  const setRunningState = useCallback((running) => {
    logger.info('[GameOfLifeApp] setRunningState called:', running);
    if (gameRef.current) {
      gameRef.current.setRunning(running);
      setIsRunning(running);
    }
  }, []);


  // ...existing code...

  // Centralized palette management through model
  const openPalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: true }));
  }, []);

  const closePalette = useCallback(() => {
    setUIState(prev => ({ ...prev, paletteOpen: false }));
  }, []);

  const handleSaveCapturedShape = useCallback(async (shapeData) => {
    try {
      const shapeForBackend = {
        ...shapeData,
        cells: shapeData.pattern,
        meta: {
          capturedAt: new Date().toISOString(),
          source: 'capture-tool'
        }
      };

      delete shapeForBackend.pattern;

      const response = await fetch('http://localhost:55000/v1/shapes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shapeForBackend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const savedShape = await response.json();
      logger.info('Shape saved successfully:', savedShape.name);

      return savedShape;
    } catch (error) {
      logger.error('Failed to save captured shape:', error);
      throw error;
    }
  }, []);

  // Grid loading
  const handleLoadGrid = useCallback((liveCells) => {
    if (!gameRef.current) return;

    try {
      gameRef.current.clear();

      if (liveCells && liveCells.size > 0) {
        for (const [key] of liveCells.entries()) {
          const [x, y] = key.split(',').map(Number);
          gameRef.current.setCellAlive(x, y, true);
        }
        // After loading, center viewport on the loaded pattern and force a render
        if (typeof gameRef.current.controller?.centerOnLiveCells === 'function') {
          gameRef.current.controller.centerOnLiveCells();
        } else if (typeof gameRef.current.view?.render === 'function') {
          const lp = gameRef.current.model.getLiveCells();
          const vp = gameRef.current.model.getViewport();
          gameRef.current.view.render(lp, vp);
        }
      }

      logger.info(`Loaded grid with ${liveCells ? liveCells.size : 0} live cells`);
    } catch (error) {
      logger.error('Failed to load grid:', error);
    }
  }, []);



  // Animation loop integration for double buffering
  useEffect(() => {
    let animationFrameId;
    function animationLoop() {
      // Flush randomRect buffer if present (prefer controller buffer)
      if (gameRef.current?.randomRectBuffer) {
        flushRandomRectBuffer({ _controller: gameRef.current }, setCellAlive);
      } else if (gameRef.current?.toolState?.randomRectBuffer) {
        flushRandomRectBuffer(gameRef.current.toolState, setCellAlive);
      }
      // Continue animation (existing logic)
      if (isRunning && gameRef.current) {
        gameRef.current.step();
      }
      animationFrameId = requestAnimationFrame(animationLoop);
    }
    animationFrameId = requestAnimationFrame(animationLoop);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, setCellAlive]);

  return (
    <div className="canvas-container" style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {/* Static recent shapes strip on the left */}
      <div className="recent-shapes" style={{ width: 110, minWidth: 110, background: '#222', padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <RecentShapesStrip
          recentShapes={recentShapesState}
          selectShape={handleSelectShape}
          drawWithOverlay={canvasManager.drawWithOverlay}
          colorScheme={colorScheme}
          selectedShape={gameRef.current ? gameRef.current.getSelectedShape() : null}
          maxSlots={8}
          onRotateShape={handleRotateShape}
          onSwitchToShapesTool={() => {
            if (gameRef.current && typeof gameRef.current.setSelectedTool === 'function') {
              gameRef.current.setSelectedTool('shapes');
            }
          }}
        />
      </div>
      {/* Main content area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Main controls row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <ControlsBar
              selectedTool={gameRef.current ? gameRef.current.getSelectedTool() : null}
              setSelectedTool={tool => {
                if (gameRef.current && typeof gameRef.current.setSelectedTool === 'function') {
                  gameRef.current.setSelectedTool(tool);
                }
              }}
              onCenterViewport={() => {
                if (gameRef.current && typeof gameRef.current.centerOnLiveCells === 'function') {
                  gameRef.current.centerOnLiveCells();
                }
              }}
              model={gameRef.current ? gameRef.current.model : null}
              colorSchemeKey={uiState?.colorSchemeKey || 'spectrum'}
              setColorSchemeKey={setColorSchemeKey}
              colorSchemes={colorSchemes}
              isRunning={isRunning}
              setIsRunning={setRunningState}
              step={step}
              draw={canvasManager.drawWithOverlay}
              clear={clear}
              generation={generation}
              snapshotsRef={{ current: [] }}
              setSteadyInfo={setSteadyInfo}
              canvasRef={canvasRef}
              offsetRef={{ current: getViewport() }}
              cellSize={getViewport().cellSize}
              setCellAlive={setCellAlive}
              popHistoryRef={{ current: (gameRef.current && typeof gameRef.current.getPopulationHistory === 'function') ? gameRef.current.getPopulationHistory() : [] }}
              setShowChart={setShowChart}
              getLiveCells={getLiveCells}
              popWindowSize={popWindowSize}
              setPopWindowSize={setPopWindowSize}
              popTolerance={popTolerance}
              setPopTolerance={setPopTolerance}
              selectShape={handleSelectShape}
              selectedShape={gameRef.current ? gameRef.current.getSelectedShape() : null}
              drawWithOverlay={canvasManager.drawWithOverlay}
              openPalette={openPalette}
              steadyInfo={steadyInfo}
              toolStateRef={toolStateRef}
              cursorCell={cursorCell}
              onLoadGrid={handleLoadGrid}
              showSpeedGauge={uiState?.showSpeedGauge ?? true}
              setShowSpeedGauge={setShowSpeedGauge}
              maxFPS={performanceSettings.maxFPS}
              setMaxFPS={setMaxFPS}
              maxGPS={performanceSettings.maxGPS}
              setMaxGPS={setMaxGPS}
            />
          </div>
        </div>

        {/* Selected tool indicator - bottom center */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}>
          <SelectedToolIndicator selectedTool={selectedTool} />
        </div>

        {(uiState?.paletteOpen ?? false) && (
          <ShapePaletteDialog
            open={uiState.paletteOpen}
            onClose={() => closePalette(true)}
            onSelectShape={shape => {
              if (gameRef.current && typeof gameRef.current.setSelectedShape === 'function') {
                gameRef.current.setSelectedShape(shape);
              }
              shapeManager.selectShapeAndClosePalette(shape);
            }}
            backendBase={process.env.REACT_APP_BACKEND_BASE || 'http://localhost:55000'}
            colorScheme={colorSchemes ? (colorSchemes[uiState.colorSchemeKey] || {}) : {}}
          />
        )}

        {(uiState?.captureDialogOpen ?? false) && (
          <CaptureShapeDialog
            open={uiState.captureDialogOpen}
            onClose={() => setCaptureDialogOpen(false)}
            captureData={uiState.captureData}
            onSave={handleSaveCapturedShape}
          />
        )}

        <canvas 
          ref={canvasRef}
          style={{
            cursor: (selectedShape || selectedTool) ? 'crosshair' : 'default',
            display: 'block',
            width: '100%',
            height: '100%'
          }}
        />

        {(uiState?.showChart ?? false) && (
          <PopulationChart
            history={(gameRef.current && typeof gameRef.current.getPopulationHistory === 'function') ? gameRef.current.getPopulationHistory() : []}
            onClose={() => setShowChart(false)}
            isRunning={isRunning}
          />
        )}

        <SpeedGauge
          isVisible={uiState?.showSpeedGauge ?? true}
          gameRef={gameRef}
          onToggleVisibility={setShowSpeedGauge}
          position={{ top: 10, right: 10 }}
        />
      </div>
    </div>
  );
}

GameOfLifeApp.propTypes = {
  onModelReady: PropTypes.func,
  initialUIState: PropTypes.object
};

export default GameOfLifeApp;