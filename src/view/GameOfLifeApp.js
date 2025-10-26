// GameOfLifeApp.js - React UI wrapper for the MVC Game of Life system
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameMVC } from '../controller/GameMVC';
import ControlsBar from '../view/ControlsBar';
import PopulationChart from '../view/PopulationChart';
import ShapePaletteDialog from '../view/ShapePaletteDialog';
import CaptureShapeDialog from '../view/CaptureShapeDialog';
import RecentShapesStrip from '../view/RecentShapesStrip';
import SpeedGauge from '../view/SpeedGauge';
import { flushRandomRectBuffer } from '../controller/tools/randomRectTool';
import { useShapeManager } from '../view/hooks/useShapeManager';
import { colorSchemes } from '../model/colorSchemes';
import isPopulationStable from '../controller/utils/populationUtils';
import logger from '../controller/utils/logger';
import '../view/GameOfLife.css';

// Constants
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const RECENT_SHAPES_LEFT_OFFSET = 8;
const RECENT_SHAPES_TOP_OFFSET = 80;
const RECENT_SHAPES_Z_INDEX = 20;

const GameOfLifeApp = () => {
  
  // Refs
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  
  // React state for UI components
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  // Tool and interaction state now managed by model
  const [selectedTool, setSelectedTool] = useState('draw'); // Temp for UI sync
  const [selectedShape, setSelectedShape] = useState(null);
// Temp for UI sync
  const [cursorCell, setCursorCell] = useState(null); // Temp for UI sync
  
  // UI state managed by model
  const defaultUIState = React.useMemo(() => ({
    showChart: false,
    showSpeedGauge: true,
    colorSchemeKey: 'spectrum',
    captureDialogOpen: false,
    paletteOpen: false,
    captureData: null
  }), []);
  const [uiState, setUIStateRaw] = useState(defaultUIState);

  // Always merge updates with defaults to preserve required keys.
  // When merging updates from the model, prefer the current local UI
  // state (prev) so user-initiated UI actions (like opening a palette)
  // are not immediately overwritten by the model during initialization.
  const setUIState = useCallback((update) => {
    setUIStateRaw(prev => {
      // If update is a function, we treat it as a user-initiated change and
      // allow it to override the previous local state. If it's an object,
      // we assume it's coming from the model and avoid overwriting user
      // interactions by keeping prev values last.
      if (typeof update === 'function') {
        const newUpdate = update(prev) || {};
        return {
          ...defaultUIState,
          ...prev,
          ...newUpdate // user action overrides prev
        };
      }

      const nextUpdate = update || {};
      return {
        ...defaultUIState,
        ...nextUpdate, // model-provided update
        ...prev // keep local state (user) last to preserve their actions
      };
    });
  }, [defaultUIState]);
  
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
  
  const updateStabilityDetection = useCallback((game) => {
    const populationHistory = game.getPopulationHistory();
    const liveCells = game.getLiveCells();
    
    // Population stability - use current ref values
    const popSteady = isPopulationStable(populationHistory, popWindowSizeRef.current, popToleranceRef.current);
    
    // Pattern period detection  
    const period = game.detectPeriod();
    
    const detected = popSteady || period > 0;
    setSteadyInfo({
      steady: detected,
      period: period || (popSteady ? 1 : 0),
      popChanging: !popSteady
    });

    if (popSteady && !steadyDetectedRef.current && liveCells.size > 0) {
      steadyDetectedRef.current = true;
      game.setRunning(false);
    } else if (!popSteady) {
      steadyDetectedRef.current = false;
    }
  }, []); // No dependencies - use refs for current values

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
      game.onModelChange((event, data) => {
        switch (event) {
          case 'selectedToolChanged':
            setSelectedTool(data);
            break;
          case 'selectedShapeChanged':
            setSelectedModelShape(data);
            break;
          case 'cursorPositionChanged':
            setCursorCell(data);
            break;
          case 'gameStep':
            setGeneration(data.generation);
            break;
          case 'runningStateChanged':
            setIsRunning(data.isRunning);
            break;
          case 'uiStateChanged':
            setUIState(data);
            break;
          case 'performanceSettingsChanged':
            setPerformanceSettings(data);
            break;
          default:
            // Other events not handled by this component
            break;
        }
      });

      // Wait for all tools to load before enabling interactions
      game.waitForTools().then(() => {
        
        // Initialize React state from model
        setSelectedTool(game.getSelectedTool());
        setSelectedModelShape(game.getSelectedShape());
        setCursorCell(game.getCursorPosition());
        setGeneration(game.getGeneration());
        setIsRunning(game.getIsRunning());
        setUIState(game.getUIState());
        setPerformanceSettings(game.getPerformanceSettings());
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
  }, [colorScheme, setUIState]); // Re-initialize when color scheme changes  
  
  // Update color scheme in model when it changes
  useEffect(() => {
    if (gameRef.current && colorScheme) {
      logger.info('🎨 Updating color scheme to:', uiState.colorSchemeKey);
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
  }, [colorScheme, uiState.colorSchemeKey]);

  // Setup game event listeners (separate from game creation to avoid circular dependencies)
  useEffect(() => {
    if (!gameRef.current) return;
    
    const game = gameRef.current;
    
    // Setup game event listeners
    game.onModelChange((event, data) => {
      switch (event) {
        case 'gameStep':
          setGeneration(data.generation);
          updateStabilityDetection(game);
          break;
        case 'cellChanged':
          // No longer tracking cellCount in React state
          break;
        case 'gameCleared':
          setGeneration(0);
          steadyDetectedRef.current = false;
          setSteadyInfo({ steady: false, period: 0, popChanging: false });
          break;
        case 'runningStateChanged':
          setIsRunning(data.isRunning);
          break;
        default:
          // Handle other events
          break;
      }
    });

    // Setup performance tracking
    if (globalThis.speedGaugeTracker) {
      game.addPerformanceCallback((frameTime) => {
        globalThis.speedGaugeTracker(frameTime, frameTime);
      });
    }

    return () => {
      // No cleanup needed for this effect
    };
  }, [updateStabilityDetection]); // Only re-run when updateStabilityDetection changes

  // UI State management functions
  const setColorSchemeKey = useCallback((key) => {
    if (gameRef.current) {
      gameRef.current.setUIState({ colorSchemeKey: key });
    }
  }, []);

  const setShowChart = useCallback((show) => {
    if (gameRef.current) {
      gameRef.current.setUIState({ showChart: show });
    }
  }, []);

  const setShowSpeedGauge = useCallback((show) => {
    if (gameRef.current) {
      gameRef.current.setUIState({ showSpeedGauge: show });
    }
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
    if (gameRef.current) {
      gameRef.current.setUIState({ captureDialogOpen: open });
    }
  }, []);

  // Component lifecycle tracking
  useEffect(() => {
    return () => {
      // Component unmounting
    };
  }, []);

  // Tool management
  const handleSetSelectedTool = useCallback((tool) => {
    if (gameRef.current) {
      gameRef.current.setSelectedTool(tool);
      setSelectedTool(tool);
    }
  

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

  // Shape management
  const {
    recentShapes,
    selectShape,
    selectShapeAndClosePalette
  } = useShapeManager({
    selectedShape,
    setSelectedShape,
    selectedTool,
    handleSetSelectedTool,
    toolStateRef: { current: {} }, // MVC handles tool state internally
    drawWithOverlay: () => {} // MVC handles rendering automatically
  });

  // Centralized palette management through model
  const openPalette = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.openDialog('palette');
      // Also optimistically update local UI state so tests and UI
      // interactions immediately reflect the user's intent without
      // waiting for model change events.
      setUIState(prev => ({ ...prev, paletteOpen: true }));
    } else {
      // When running in tests without MVC, toggle local uiState to open the dialog
      setUIState(prev => ({ ...prev, paletteOpen: true }));
    }
  }, [setUIState]);

  const closePalette = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.closeDialog('palette');
      setUIState(prev => ({ ...prev, paletteOpen: false }));
    } else {
      setUIState(prev => ({ ...prev, paletteOpen: false }));
    }
  }, [setUIState]);



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

  // Viewport helpers for legacy components
  const getViewport = useCallback(() => {
    return gameRef.current ? gameRef.current.getViewport() : { offsetX: 0, offsetY: 0, cellSize: 8 };
  }, []);

  const getLiveCells = useCallback(() => {
    return gameRef.current ? gameRef.current.getLiveCells() : new Map();
  }, []);

  const setCellAlive = useCallback((x, y, alive) => {
    if (gameRef.current) {
      gameRef.current.setCellAlive(x, y, alive);
    }
  }, []);

  // Animation loop integration for double buffering
  useEffect(() => {
    let animationFrameId;
    function animationLoop() {
      // Flush randomRect buffer if present (prefer controller buffer)
      if (gameRef.current && gameRef.current.randomRectBuffer) {
        flushRandomRectBuffer({ _controller: gameRef.current }, setCellAlive);
      } else if (gameRef.current && gameRef.current.toolState?.randomRectBuffer) {
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
          drawWithOverlay={() => {}} // MVC handles rendering
          colorScheme={colorScheme}
          selectedShape={selectedShape}
        />
      </div>

      <ControlsBar
        selectedTool={selectedTool}
        setSelectedTool={handleSetSelectedTool}
        colorSchemeKey={uiState.colorSchemeKey}
        setColorSchemeKey={setColorSchemeKey}
        colorSchemes={colorSchemes}
        isRunning={isRunning}
        setIsRunning={setRunningState}
        step={step}
        draw={() => {}} // MVC handles rendering automatically
        clear={clear}
        generation={generation}
        snapshotsRef={{ current: [] }} // Not needed in MVC
        setSteadyInfo={setSteadyInfo}
        canvasRef={canvasRef}
        offsetRef={{ current: getViewport() }} // Legacy compatibility
        cellSize={getViewport().cellSize}
        setCellAlive={setCellAlive}
        popHistoryRef={{ current: gameRef.current?.getPopulationHistory() || [] }}
        setShowChart={setShowChart}
        getLiveCells={getLiveCells}
        popWindowSize={popWindowSize}
        setPopWindowSize={setPopWindowSize}
        popTolerance={popTolerance}
        setPopTolerance={setPopTolerance}
        selectShape={selectShape}
        selectedShape={selectedShape}
        drawWithOverlay={() => {}} // MVC handles rendering
        openPalette={openPalette}
        steadyInfo={steadyInfo}
        toolStateRef={{ current: {} }} // MVC handles tool state
        cursorCell={cursorCell}
        onLoadGrid={handleLoadGrid}
        showSpeedGauge={uiState.showSpeedGauge}
        setShowSpeedGauge={setShowSpeedGauge}
        maxFPS={performanceSettings.maxFPS}
        setMaxFPS={setMaxFPS}
        maxGPS={performanceSettings.maxGPS}
        setMaxGPS={setMaxGPS}
      />

      {uiState.paletteOpen && (
        <ShapePaletteDialog
          open={uiState.paletteOpen}
          onClose={() => closePalette(true)}
          onSelectShape={selectShapeAndClosePalette}
          backendBase={process.env.REACT_APP_BACKEND_BASE || 'http://localhost:55000'}
          colorScheme={colorSchemes ? (colorSchemes[uiState.colorSchemeKey] || {}) : {}}
        />
      )}

      {uiState.captureDialogOpen && (
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

      {uiState.showChart && (
        <PopulationChart 
          history={gameRef.current?.getPopulationHistory() || []} 
          onClose={() => setShowChart(false)}
          isRunning={isRunning}
        />
      )}
      
      <SpeedGauge
        isVisible={uiState.showSpeedGauge}
        gameRef={gameRef}
        onToggleVisibility={setShowSpeedGauge}
        position={{ top: 10, right: 10 }}
      />
  
    </div>
  );
};

// Track component lifecycle
GameOfLifeApp.displayName = 'GameOfLifeApp';

export default GameOfLifeApp;