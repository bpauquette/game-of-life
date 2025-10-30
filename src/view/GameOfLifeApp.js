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
import PropTypes from 'prop-types';
// Fill toolMap with available tools
const toolMap = {
  draw: drawTool,
  line: lineTool,
  rect: rectTool,
  circle: circleTool,
  oval: ovalTool,
  shapes: shapesTool,
  randomRect: randomRectTool
};
// Constants
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const RECENT_SHAPES_LEFT_OFFSET = 8;
const RECENT_SHAPES_TOP_OFFSET = 80;
const RECENT_SHAPES_Z_INDEX = 20;



/* eslint-disable sonarjs/cognitive-complexity */
function GameOfLifeApp(props) {

  // Helper: handle model change events - defined after updateStabilityDetection
  // const handleModelChange = ... (moved below)
  // Viewport helpers for legacy components
  // Callback to show/hide chart
  const setShowChart = useCallback((show) => {
    setUIState(prev => ({ ...prev, showChart: show }));
  }, []);
  // Refs

  // Viewport helpers for legacy components
  // Destructure props for useEffect dependencies
  const { onModelReady, initialUIState } = props;

  // Refs
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  // UI state hooks
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTool, setSelectedTool] = useState('draw');
  const [selectedShape, setSelectedShape] = useState(null);
  const [cursorCell, setCursorCell] = useState(null);

  // UI state managed locally in React
  const defaultUIState = React.useMemo(() => ({
    showChart: false,
    showSpeedGauge: true,
    colorSchemeKey: 'spectrum',
    captureDialogOpen: false,
    paletteOpen: false,
    captureData: null
  }), []);
  const [uiState, setUIState] = useState(initialUIState || defaultUIState);


  // Callback to update selectedShape from model
  const setSelectedModelShape = useCallback((data) => {
    setSelectedShape(data);
  }, []);

  // Population stability tracking
  const [popWindowSize, setPopWindowSize] = useState(DEFAULT_POPULATION_WINDOW_SIZE);
  const [popTolerance, setPopTolerance] = useState(DEFAULT_POPULATION_TOLERANCE);
  const [steadyInfo, setSteadyInfo] = useState({ steady: false, period: 0, popChanging: false });
  const steadyDetectedRef = useRef(false);

  // Performance tracking managed by model
  const [performanceSettings, setPerformanceSettings] = useState({
    maxFPS: 60,
    maxGPS: 30
  });

  // Color scheme
  const colorScheme = React.useMemo(() => {
    const colorSchemeKey = uiState?.colorSchemeKey || 'spectrum';
    const base = colorSchemes[colorSchemeKey] || {};
    const copy = { ...base };
    if (typeof Object.freeze === 'function') {
      Object.freeze(copy);
    }
    return copy;
  }, [uiState?.colorSchemeKey]);

  // Use ref to store current values and avoid useCallback dependencies
  const popWindowSizeRef = useRef(popWindowSize);
  const popToleranceRef = useRef(popTolerance);

  // Stability detection
  // Update refs when values change
  useEffect(() => {
    popWindowSizeRef.current = popWindowSize;
  }, [popWindowSize]);

  useEffect(() => {
    popToleranceRef.current = popTolerance;
  }, [popTolerance]);

  // Viewport helpers for legacy components - defined early
  const getViewport = useCallback(() => {
    if (gameRef.current && typeof gameRef.current.getViewport === 'function') {
      return gameRef.current.getViewport();
    }
    return { offsetX: 0, offsetY: 0, cellSize: 8 };
  }, []);

  const getLiveCells = useCallback(() => {
    return gameRef.current ? gameRef.current.getLiveCells() : new Map();
  }, []);

  const setCellAlive = useCallback((x, y, alive) => {
    if (gameRef.current) {
      gameRef.current.setCellAlive(x, y, alive);
    }
  }, []);

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
    if (gameRef.current && gameRef.current.controller) {
      gameRef.current.controller.requestRender();
      // Force a direct render for safety (works even if game loop is stopped)
      const liveCells = gameRef.current.model.getLiveCells();
      const viewport = gameRef.current.model.getViewport();
      gameRef.current.view.render(liveCells, viewport);
    }
  }, []);

  // Event type to handler mapping
  const eventHandlers = React.useMemo(() => ({
    'selectedToolChanged': (data) => setSelectedTool(data),
    'selectedShapeChanged': (data) => setSelectedShape(data),
    'cursorPositionChanged': (data) => setCursorCell(data),
    'gameStep': handleGameStep,
    'runningStateChanged': (data) => setIsRunning(data.isRunning),
    'performanceSettingsChanged': (data) => setPerformanceSettings(data),
    'gameCleared': handleGameCleared
  }), [handleGameStep, handleGameCleared]);

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
        setSelectedTool(game.getSelectedTool());
        setSelectedModelShape(game.getSelectedShape());
        setCursorCell(game.getCursorPosition());
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

    return () => {
      if (gameRef.current) {
        // Note: GameMVC doesn't have a destroy method yet
        gameRef.current = null;
      }
    };
  }, [colorScheme, onModelReady, setSelectedModelShape, handleModelChange]);

  // Update color scheme in model when it changes
  useEffect(() => {
    const colorSchemeKey = uiState?.colorSchemeKey || 'spectrum';
    if (gameRef.current && colorScheme) {
      logger.info('🎨 Updating color scheme to:', colorSchemeKey);
      // Set colorScheme in the model for rendering
      gameRef.current.setColorScheme(colorScheme);
      // Update renderer background/grid colors
      gameRef.current.view.renderer.updateOptions({
        backgroundColor: colorScheme.background || colorScheme.backgroundColor || '#000000',
        gridColor: colorScheme.gridColor || '#202020'
      });
      // Force re-render with new colors
      gameRef.current.controller.requestRender();
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
    setUIState(prev => ({ ...prev, showSpeedGauge: show }));
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
  // Tool selection is managed by React state only
  // Remove all indirection via model/controller for tool selection
  // ControlsBar and ToolStatus use selectedTool/setSelectedTool from here

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
    if (gameRef.current) {
      gameRef.current.setRunning(running);
      setIsRunning(running);
    }
  }, []);


  // toolMap is defined at the top level
  const toolStateRef = useRef({});
  const canvasManager = useCanvasManager({
    getLiveCells,
    cellSize: getViewport().cellSize,
    offsetRef: { current: getViewport() },
    colorScheme,
    selectedTool,
    toolMap,
    toolStateRef,
    setCellAlive,
    scheduleCursorUpdate: () => {},
    selectedShape,
    placeShape: () => {},
    logger
  });

  // Shape management
  const {
    recentShapes,
    selectShape: selectShapeFromHook,
    selectShapeAndClosePalette: selectShapeAndClosePaletteFromHook
  } = useShapeManager({
    selectedShape,
    setSelectedShape,
    selectedTool,
    toolStateRef,
    drawWithOverlay: canvasManager.drawWithOverlay
  });

  // Wrapper to sync shape selection with game controller
  const selectShape = useCallback((shape) => {
    selectShapeFromHook(shape);
    if (gameRef.current && typeof gameRef.current.setSelectedShape === 'function') {
      gameRef.current.setSelectedShape(shape);
    }
    // When a shape is selected, switch to shapes tool
    if (shape) {
      setSelectedTool('shapes');
      if (gameRef.current && typeof gameRef.current.setSelectedTool === 'function') {
        gameRef.current.setSelectedTool('shapes');
      }
    }
  }, [selectShapeFromHook]);

  const selectShapeAndClosePalette = useCallback((shape) => {
    console.log('[GameOfLifeApp] selectShapeAndClosePalette called with shape:', shape);
    selectShapeAndClosePaletteFromHook(shape);
    if (gameRef.current && typeof gameRef.current.setSelectedShape === 'function') {
      console.log('[GameOfLifeApp] Calling gameRef.current.setSelectedShape');
      gameRef.current.setSelectedShape(shape);
    } else {
      console.warn('[GameOfLifeApp] gameRef.current.setSelectedShape not available');
    }
    // When a shape is selected, switch to shapes tool
    if (shape) {
      setSelectedTool('shapes');
      if (gameRef.current && typeof gameRef.current.setSelectedTool === 'function') {
        console.log('[GameOfLifeApp] Calling gameRef.current.setSelectedTool');
        gameRef.current.setSelectedTool('shapes');
      } else {
        console.warn('[GameOfLifeApp] gameRef.current.setSelectedTool not available');
      }
    }
  }, [selectShapeAndClosePaletteFromHook]);

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
    <div className="canvas-container">
      {/* Left-side recent shapes strip */}
      <div className="recent-shapes" style={{
        position: 'absolute',
        left: RECENT_SHAPES_LEFT_OFFSET,
        top: RECENT_SHAPES_TOP_OFFSET,
        zIndex: RECENT_SHAPES_Z_INDEX
      }}>
        <RecentShapesStrip
          recentShapes={recentShapes}
          selectShape={selectShape}
          drawWithOverlay={canvasManager.drawWithOverlay}
          colorScheme={colorScheme}
          selectedShape={selectedShape}
        />
      </div>

      {/* Main controls row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <ControlsBar
            selectedTool={selectedTool}
            setSelectedTool={tool => {
              setSelectedTool(tool);
              if (gameRef.current && typeof gameRef.current.setSelectedTool === 'function') {
                gameRef.current.setSelectedTool(tool);
              }
            }}
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
            selectShape={selectShape}
            selectedShape={selectedShape}
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
          onSelectShape={selectShapeAndClosePalette}
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
  );
}

GameOfLifeApp.propTypes = {
  onModelReady: PropTypes.func,
  initialUIState: PropTypes.object
};

export default GameOfLifeApp;