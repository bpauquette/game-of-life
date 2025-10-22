// GameOfLifeApp.js - React UI wrapper for the MVC Game of Life system
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameMVC } from '../controller/GameMVC';
import ControlsBar from '../view/ControlsBar';
import PopulationChart from '../view/PopulationChart';
import ShapePaletteDialog from '../view/ShapePaletteDialog';
import CaptureShapeDialog from '../view/CaptureShapeDialog';
import RecentShapesStrip from '../view/RecentShapesStrip';
import SpeedGauge from '../view/SpeedGauge';
import DebugConsole from '../view/DebugConsole';
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
  const [cellCount, setCellCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTool, setSelectedToolState] = useState('draw');
  const [selectedShape, setSelectedShapeState] = useState(null);
  const [cursorCell, setCursorCell] = useState(null);
  
  // UI state
  const [showChart, setShowChart] = useState(false);
  const [showSpeedGauge, setShowSpeedGauge] = useState(true);
  const [colorSchemeKey, setColorSchemeKey] = useState('spectrum');
  
  // Population stability tracking
  const [popWindowSize, setPopWindowSize] = useState(DEFAULT_POPULATION_WINDOW_SIZE);
  const [popTolerance, setPopTolerance] = useState(DEFAULT_POPULATION_TOLERANCE);
  const [steadyInfo, setSteadyInfo] = useState({ steady: false, period: 0, popChanging: false });
  const steadyDetectedRef = useRef(false);
  
  // Performance tracking
  const [maxFPS, setMaxFPS] = useState(60);
  const [maxGPS, setMaxGPS] = useState(30);
  
  // Capture dialog state
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureData] = useState(null);

  // Color scheme
  const colorScheme = React.useMemo(() => {
    const base = colorSchemes[colorSchemeKey] || {};
    const copy = { ...base };
    if (typeof Object.freeze === 'function') {
      Object.freeze(copy);
    }
    return copy;
  }, [colorSchemeKey]);

  // Stability detection
  const updateStabilityDetection = useCallback((game) => {
    const populationHistory = game.getPopulationHistory();
    const liveCells = game.getLiveCells();
    
    // Population stability
    const popSteady = isPopulationStable(populationHistory, popWindowSize, popTolerance);
    
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
  }, [popWindowSize, popTolerance]);

  // Initialize game
  useEffect(() => {
    console.log('🎮 Game of Life MVC System Initializing...');
    if (!canvasRef.current) return;
    
    const game = new GameMVC(canvasRef.current, {
      view: {
        backgroundColor: colorScheme.backgroundColor || '#000000',
        gridColor: colorScheme.gridColor || '#202020',
        cellSaturation: colorScheme.cellSaturation || 80,
        cellLightness: colorScheme.cellLightness || 55
      }
    });
    
    gameRef.current = game;
    console.log('✅ MVC Game System Created Successfully');
    console.log('Available tools:', Object.keys(game.controller?.toolMap || {}));
    
    // Setup game event listeners
    game.onModelChange((event, data) => {
      switch (event) {
        case 'gameStep':
          setGeneration(data.generation);
          setCellCount(data.population);
          updateStabilityDetection(game);
          break;
        case 'cellChanged':
          setCellCount(game.getCellCount());
          break;
        case 'gameCleared':
          setGeneration(0);
          setCellCount(0);
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
    if (window.speedGaugeTracker) {
      game.addPerformanceCallback((frameTime) => {
        window.speedGaugeTracker(frameTime, frameTime);
      });
    }
    
    // Cursor tracking
    let rafId = null;
    game.view.on('mouseMove', ({ cellCoords }) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setCursorCell(cellCoords);
        rafId = null;
      });
    });
    
    return () => {
      game.destroy();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []); // Remove colorScheme from dependency - don't recreate game on color change!

  // Update colors when color scheme changes (without recreating game)
  useEffect(() => {
    if (gameRef.current && colorScheme) {
      console.log('🎨 Updating color scheme to:', colorSchemeKey);
      // Update renderer colors without destroying the game
      gameRef.current.view.renderer.updateOptions({
        backgroundColor: colorScheme.backgroundColor || '#000000',
        gridColor: colorScheme.gridColor || '#202020',
        cellSaturation: colorScheme.cellSaturation || 80,
        cellLightness: colorScheme.cellLightness || 55
      });
      // Force re-render with new colors
      gameRef.current.controller.requestRender();
    }
  }, [colorScheme, colorSchemeKey]);

  // Tool management
  const setSelectedTool = useCallback((tool) => {
    console.log('React: Setting tool to:', tool);
    if (gameRef.current) {
      gameRef.current.setSelectedTool(tool);
      setSelectedToolState(tool);
      console.log('React: Tool set in MVC system');
    } else {
      console.log('React: gameRef.current is null!');
    }
  }, []);

  const setSelectedShape = useCallback((shape) => {
    if (gameRef.current) {
      gameRef.current.setSelectedShape(shape);
      setSelectedShapeState(shape);
    }
  }, []);

  // Game controls
  const step = useCallback(() => {
    console.log('⏭️ STEP button clicked');
    if (gameRef.current) {
      console.log('Calling gameRef.current.step()');
      gameRef.current.step();
    } else {
      console.error('gameRef.current is null - cannot step');
    }
  }, []);

  const clear = useCallback(() => {
    console.log('🗑️ CLEAR button clicked');
    if (gameRef.current) {
      console.log('Calling gameRef.current.clear()');
      gameRef.current.clear();
    } else {
      console.error('gameRef.current is null - cannot clear');
    }
  }, []);

  const setRunningState = useCallback((running) => {
    console.log(`🎮 ${running ? 'START' : 'STOP'} button clicked`);
    if (gameRef.current) {
      console.log('Calling gameRef.current.setRunning with:', running);
      gameRef.current.setRunning(running);
    } else {
      console.error('gameRef.current is null - cannot set running state');
    }
  }, []);

  // Shape management
  const {
    recentShapes,
    paletteOpen,
    selectShape,
    openPalette,
    closePalette,
    selectShapeAndClosePalette
  } = useShapeManager({
    selectedShape,
    setSelectedShape,
    selectedTool,
    setSelectedTool,
    toolStateRef: { current: {} }, // MVC handles tool state internally
    drawWithOverlay: () => {} // MVC handles rendering automatically
  });



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
        setSelectedTool={setSelectedTool}
        colorSchemeKey={colorSchemeKey}
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
        showSpeedGauge={showSpeedGauge}
        setShowSpeedGauge={setShowSpeedGauge}
        maxFPS={maxFPS}
        setMaxFPS={setMaxFPS}
        maxGPS={maxGPS}
        setMaxGPS={setMaxGPS}
      />

      {paletteOpen && (
        <ShapePaletteDialog
          open={paletteOpen}
          onClose={() => closePalette(true)}
          onSelectShape={selectShapeAndClosePalette}
          backendBase={process.env.REACT_APP_BACKEND_BASE || 'http://localhost:55000'}
          colorScheme={colorSchemes ? (colorSchemes[colorSchemeKey] || {}) : {}}
        />
      )}

      {captureDialogOpen && (
        <CaptureShapeDialog
          open={captureDialogOpen}
          onClose={() => setCaptureDialogOpen(false)}
          captureData={captureData}
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

      {showChart && (
        <PopulationChart 
          history={gameRef.current?.getPopulationHistory() || []} 
          onClose={() => setShowChart(false)}
          isRunning={isRunning}
        />
      )}
      
      <SpeedGauge
        isVisible={showSpeedGauge}
        generation={generation}
        liveCellsCount={cellCount}
        onToggleVisibility={setShowSpeedGauge}
        position={{ top: 10, right: 10 }}
      />
      
      <DebugConsole 
        isVisible={true}
        maxLines={50}
      />
    </div>
  );
};

export default GameOfLifeApp;