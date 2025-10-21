// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
// shapes list removed from frontend; shape data is provided by palette or backend
import { useChunkedGameState } from './chunkedGameState';
import { colorSchemes } from './colorSchemes';
import isPopulationStable from './utils/populationUtils';
import { drawTool } from '../controller/tools/drawTool';
import { lineTool } from '../controller/tools/lineTool';
import { rectTool } from '../controller/tools/rectTool';
import { circleTool } from '../controller/tools/circleTool';
import { ovalTool } from '../controller/tools/ovalTool';
import { randomRectTool } from '../controller/tools/randomRectTool';
import { shapesTool } from '../controller/tools/shapesTool';
import { captureTool } from '../controller/tools/captureTool';
import logger from '../controller/utils/logger';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';
import ControlsBar from './ControlsBar';
import RecentShapesStrip from './RecentShapesStrip';
import ShapePaletteDialog from './ShapePaletteDialog';
import CaptureShapeDialog from './CaptureShapeDialog';
import { useShapeManager } from './hooks/useShapeManager';
import SpeedGauge from './SpeedGauge';
import { GameRenderer, ShapePreviewOverlay, ToolOverlay } from './GameRenderer';
import { usePerformanceMonitor } from './optimizedEngine';

// Constants to avoid magic numbers
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const MAX_POPULATION_HISTORY = 1000;
const MAX_CELL_SIZE = 200;
const ZOOM_FACTOR = 1.12;
const KEYBOARD_PAN_AMOUNT = 1;
const KEYBOARD_PAN_AMOUNT_SHIFT = 10;
// Removed unused constants: SHAPE_PREVIEW_ALPHA, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT
const RECENT_SHAPES_LEFT_OFFSET = 8;
const RECENT_SHAPES_TOP_OFFSET = 80;
const RECENT_SHAPES_Z_INDEX = 20;


const GameOfLife = () => {
  // Animation ref removed - now using optimized engine
  

  const {
    getLiveCells,
    setCellAlive,
    clear,
    step,
    cellSize,
    setCellSize,
    placeShape,
    selectedShape,
    setSelectedShape,
    offsetRef,
    isRunning,
    setIsRunning
  } = useChunkedGameState();

  // population history (counts per generation)
  const [showChart, setShowChart] = React.useState(false);
  const popHistoryRef = React.useRef([]);
  // population-stability detection params (window N and tolerance X)
  const [popWindowSize, setPopWindowSize] = React.useState(DEFAULT_POPULATION_WINDOW_SIZE);
  const [popTolerance, setPopTolerance] = React.useState(DEFAULT_POPULATION_TOLERANCE);
  // steady state detection
  const snapshotsRef = React.useRef([]);
  const [steadyInfo, setSteadyInfo] = React.useState({ steady: false, period: 0, popChanging: false });
  const MAX_SNAPSHOTS = 60;
  const steadyDetectedRef = React.useRef(false);
  
  // generation counter
  const [generation, setGeneration] = React.useState(0);
  
  // Performance monitoring and speed gauge state
  const [showSpeedGauge, setShowSpeedGauge] = useState(true);
  const [maxFPS, setMaxFPS] = useState(60);
  const [maxGPS, setMaxGPS] = useState(30);
  const liveCellsRef = useRef(new Map());
  
  // Performance monitoring
  const { trackFrame } = usePerformanceMonitor(isRunning);

  // Wrapper functions to handle generation counter
  const stepWithGeneration = React.useCallback(() => {
    step();
    setGeneration(prev => prev + 1);
  }, [step]);

  const clearWithGeneration = React.useCallback(() => {
    clear();
    setGeneration(0);
    // Clear population history when clearing the game
    popHistoryRef.current = [];
  }, [clear]);

  // population stability checker moved to src/utils/populationUtils.js

  // Tool selection (e.g. freehand draw)
  // default to freehand draw so UI doesn't show an empty "None" selection
  const [selectedTool, setSelectedTool] = React.useState('draw');
  const toolStateRef = useRef({});

  // Handler for capture completion
  const handleCaptureComplete = useCallback((captureData) => {
    setCaptureData(captureData);
    setCaptureDialogOpen(true);
  }, []);

  const toolMap = useMemo(() => ({
    draw: drawTool,
    line: lineTool,
    rect: rectTool,
    circle: circleTool,
    oval: ovalTool,
    randomRect: randomRectTool,
    capture: {
      ...captureTool,
      onCaptureComplete: handleCaptureComplete
    },
    shapes: shapesTool
  }), [handleCaptureComplete]);

  // Reset tool state when switching tools to prevent overlay artifacts
  React.useEffect(() => {
    toolStateRef.current = {};
    // Clear selected shape when switching away from shapes tool
    if (selectedTool !== 'shapes') {
      setSelectedShape(null);
    }
  }, [selectedTool, setSelectedShape]);

  // Cursor tracking for tool status (throttled via RAF)
  const [cursorCell, setCursorCell] = useState(null);
  const latestCursorRef = useRef(null);
  const rafCursorRef = useRef(null);
  const scheduleCursorUpdate = useCallback((cell) => {
    latestCursorRef.current = cell;
    if (rafCursorRef.current) return;
    rafCursorRef.current = requestAnimationFrame(() => {
      setCursorCell(latestCursorRef.current);
      rafCursorRef.current = null;
    });
  }, []);

  const [colorSchemeKey, setColorSchemeKey] = React.useState('spectrum');
  // defensive: create a shallow copy and freeze it so external code cannot
  // accidentally mutate the active scheme object and change colors unexpectedly
  const colorScheme = useMemo(() => {
    const base = colorSchemes[colorSchemeKey] || {};
    // shallow copy functions/properties then freeze
    const copy = { ...base };
    // Object.freeze is widely supported in modern environments
    // If running in legacy environment, Object.freeze will be a no-op rather than throw
    if (typeof Object.freeze === 'function') {
      Object.freeze(copy);
    }
    return copy;
  }, [colorSchemeKey]);

  // Canvas ref and renderer
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  
  // Keep cellSize in a ref so draw function always gets current value
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  
  // Initialize renderer when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current, {
        backgroundColor: colorScheme.backgroundColor || '#000000',
        gridColor: colorScheme.gridColor || '#202020',
        cellSaturation: colorScheme.cellSaturation || 80,
        cellLightness: colorScheme.cellLightness || 55
      });
    }
  }, [colorScheme]);

  // Main drawing function
  const draw = useCallback(() => {
    if (!rendererRef.current) return;
    
    const startTime = performance.now();
    
    // Update renderer viewport (get current cellSize from ref to avoid stale closure)
    const currentCellSize = cellSizeRef.current;
    rendererRef.current.setViewport(offsetRef.current.x, offsetRef.current.y, currentCellSize);
    
    // Prepare overlays
    const overlays = [];
    
    // Add tool overlay
    const tool = toolMap[selectedTool];
    const toolState = toolStateRef.current;
    
    if (tool?.drawOverlay && Object.keys(toolState).length > 0) {
      // Use ToolOverlay for all tools - this delegates to their drawOverlay method
      overlays.push(new ToolOverlay(tool, toolState, currentCellSize));
    }
    
    // Add shape preview overlay for shapes tool
    if (selectedTool === 'shapes' && selectedShape && toolState.previewPosition) {
      const shapeCells = selectedShape.pattern || selectedShape.cells || [];
      overlays.push(new ShapePreviewOverlay(shapeCells, toolState.previewPosition));
    }
    
    // Render everything
    const liveCells = getLiveCells();
    liveCellsRef.current = liveCells;
    rendererRef.current.render(liveCells, overlays);
    
    const renderTime = performance.now() - startTime;
    trackFrame(renderTime);
    
    // Notify SpeedGauge tracker if available
    if (window.speedGaugeTracker) {
      window.speedGaugeTracker(renderTime, renderTime);
    }
  }, [cellSizeRef, offsetRef, toolMap, selectedTool, toolStateRef, selectedShape, getLiveCells, trackFrame]);



  // Mouse coordinate conversion
  const eventToCell = useCallback((e) => {
    if (!rendererRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return rendererRef.current.screenToCell(screenX, screenY);
  }, []);

  // Track mouse state to ensure proper tool behavior
  const mouseStateRef = useRef({ isDown: false });

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    const cellCoords = eventToCell(e);
    if (!cellCoords) return;

    mouseStateRef.current.isDown = true;
    
    const tool = toolMap[selectedTool];
    if (tool?.onMouseDown) {
      // All current tools use the old interface: onMouseDown(toolState, x, y)
      tool.onMouseDown(toolStateRef.current, cellCoords.x, cellCoords.y);
      draw();
    }
  }, [selectedTool, toolMap, toolStateRef, eventToCell, draw]);

  const handleMouseMove = useCallback((e) => {
    const cellCoords = eventToCell(e);
    if (!cellCoords) return;

    scheduleCursorUpdate(cellCoords);

    // Only call tool onMouseMove if mouse is down (for drawing tools)
    if (mouseStateRef.current.isDown) {
      const tool = toolMap[selectedTool];
      if (tool?.onMouseMove) {
        // All current tools use the old interface: onMouseMove(toolState, x, y, setCellAlive)
        tool.onMouseMove(toolStateRef.current, cellCoords.x, cellCoords.y, setCellAlive);
        draw();
      }
    }
  }, [selectedTool, toolMap, toolStateRef, setCellAlive, eventToCell, scheduleCursorUpdate, draw]);

  const handleMouseUp = useCallback((e) => {
    const cellCoords = eventToCell(e);
    if (!cellCoords) return;

    mouseStateRef.current.isDown = false;
    
    const tool = toolMap[selectedTool];
    if (tool?.onMouseUp) {
      // Most tools use interface: onMouseUp(toolState, x, y, setCellAlive)
      // Some tools like drawTool only take (toolState)
      if (tool.onMouseUp.length === 1) {
        tool.onMouseUp(toolStateRef.current);
      } else {
        tool.onMouseUp(toolStateRef.current, cellCoords.x, cellCoords.y, setCellAlive);
      }
      draw();
    }
  }, [selectedTool, toolMap, toolStateRef, setCellAlive, eventToCell, draw]);

  const handleCanvasClick = useCallback((e) => {
    const cellCoords = eventToCell(e);
    if (!cellCoords) return;

    if (selectedTool === 'draw') {
      setCellAlive(cellCoords.x, cellCoords.y, true);
      draw();
    } else if (selectedTool === 'shapes' && selectedShape) {
      placeShape(cellCoords.x, cellCoords.y, selectedShape);
      draw();
    }
  }, [selectedTool, selectedShape, setCellAlive, placeShape, eventToCell, draw]);

  // Shape management hook - handles all shape-related functionality
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
    toolStateRef,
    drawWithOverlay: draw
  });

  // Capture dialog state
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureData, setCaptureData] = useState(null);

  // Save captured shape to backend
  const handleSaveCapturedShape = useCallback(async (shapeData) => {
    try {
      // Let backend generate UUID and handle name uniqueness
      const shapeForBackend = {
        ...shapeData,
        cells: shapeData.pattern, // Backend expects 'cells' not 'pattern'
        meta: {
          capturedAt: new Date().toISOString(),
          source: 'capture-tool'
        }
      };
      
      // Remove pattern field since we renamed it to cells
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
      
      // Optionally trigger a refresh of recent shapes
      // This would require exposing a refresh function from useShapeManager
      
      return savedShape;
    } catch (error) {
      logger.error('Failed to save captured shape:', error);
      throw error;
    }
  }, []);

  // Grid loading handler
  const handleLoadGrid = React.useCallback((liveCells) => {
    try {
      // Clear current state
      clearWithGeneration();
      
      // Load the cells from the saved grid
      if (liveCells && liveCells.size > 0) {
        for (const [key] of liveCells.entries()) {
          const [x, y] = key.split(',').map(Number);
          setCellAlive(x, y, true);
        }
      }
      
      // Redraw canvas to show loaded cells immediately
      draw();
      
      logger.info(`Loaded grid with ${liveCells ? liveCells.size : 0} live cells`);
    } catch (error) {
      logger.error('Failed to load grid:', error);
    }
  }, [clearWithGeneration, setCellAlive, draw]);

  // Helper functions for game loop
  const updatePopulationHistory = useCallback(() => {
    try {
      popHistoryRef.current.push(getLiveCells().size);
      if (popHistoryRef.current.length > MAX_POPULATION_HISTORY) popHistoryRef.current.shift();
    } catch (err) {
      logger.debug('Population history update failed:', err);
    }
  }, [getLiveCells]);

  const createSnapshot = useCallback((liveMap) => {
    const keys = Array.from(liveMap.keys()).sort((a, b) => a.localeCompare(b));
    return keys.join(';');
  }, []);

  const findSnapshotMatch = useCallback((snap, snaps) => {
    for (let i = snaps.length - 1; i >= 0; i--) {
      if (snaps[i] === snap) {
        return snaps.length - 1 - i; // distance
      }
    }
    return -1;
  }, []);

  const updateSteadyState = useCallback(() => {
    try {
      const liveMap = getLiveCells();
      const snap = createSnapshot(liveMap);
      const snaps = snapshotsRef.current;
      const matchIdx = findSnapshotMatch(snap, snaps);
      
      snaps.push(snap);
      if (snaps.length > MAX_SNAPSHOTS) snaps.shift();
      snapshotsRef.current = snaps;

      const popSteady = isPopulationStable(popHistoryRef.current, popWindowSize, popTolerance);
      
      let detected = false;
      let detectedPeriod = 0;
      if (popSteady) {
        detected = true;
        detectedPeriod = 1;
      } else if (matchIdx >= 0) {
        detected = true;
        detectedPeriod = matchIdx + 1;
      }

      setSteadyInfo(detected ? 
        { steady: true, period: detectedPeriod, popChanging: !popSteady } : 
        { steady: false, period: 0, popChanging: !popSteady }
      );

      if (popSteady && !steadyDetectedRef.current && liveMap.size > 0) {
        steadyDetectedRef.current = true;
        setIsRunning(false);
      } else if (!popSteady) {
        steadyDetectedRef.current = false;
      }
    } catch (err) {
      logger.debug('Snapshot computation failed:', err);
    }
  }, [getLiveCells, createSnapshot, findSnapshotMatch, popWindowSize, popTolerance, setIsRunning, setSteadyInfo]);

  // Simple game loop with optimized drawing (temporarily disable advanced engine)
  useEffect(() => {
    if (!isRunning) return;
    
    const loop = () => {
      if (isRunning) {
        step();
        setGeneration(prev => prev + 1);
        updatePopulationHistory();
        updateSteadyState();
        draw();
        requestAnimationFrame(loop);
      }
    };
    
    const rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, step, updatePopulationHistory, updateSteadyState, draw]);



  // Panning support removed to simplify zoom behavior per user request.

  // Helper function for wheel zoom calculations
  const calculateNewCellSize = useCallback((currentSize, zoomDirection) => {
    const dpr = globalThis.window.devicePixelRatio || 1;
    const minCellSize = 1 / dpr;
    const maxCellSize = MAX_CELL_SIZE;
    const factor = zoomDirection < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;

    const prevDevice = currentSize * dpr;
    let newDevice = prevDevice * factor;
    const maxDevice = maxCellSize * dpr;
    
    newDevice = Math.max(1, Math.min(maxDevice, newDevice));
    let snappedDevice;
    
    if (newDevice > prevDevice) snappedDevice = Math.ceil(newDevice);
    else snappedDevice = Math.floor(newDevice);
    
    snappedDevice = Math.max(1, Math.min(Math.round(maxDevice), snappedDevice));
    const snappedSize = Math.max(minCellSize, snappedDevice / dpr);
    
    return snappedSize === currentSize ? currentSize : snappedSize;
  }, []);

  const handleWheelZoom = useCallback((e) => {
    // Original simple zoom behavior - only change cell size, don't adjust offset
    setCellSize(prev => calculateNewCellSize(prev, e.deltaY));
    if (e.cancelable) e.preventDefault();
    draw();
  }, [setCellSize, calculateNewCellSize, draw]);

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelZoom, { passive: false });
  }, [handleWheelZoom, canvasRef]);

  // shapes menu removed: no context menu handler

  // Canvas resize handling
  useEffect(() => {
    const resizeCanvas = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      
      const container = canvasRef.current.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      
      rendererRef.current.resize(width, height);
      draw();
    };
    
    // Initial resize
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  // Global mouse up handler to ensure tools stop drawing even when mouse leaves canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (mouseStateRef.current.isDown) {
        mouseStateRef.current.isDown = false;
        
        // Clear tool state when mouse is released globally
        const tool = toolMap[selectedTool];
        if (tool?.onMouseUp) {
          if (tool.onMouseUp.length === 1) {
            tool.onMouseUp(toolStateRef.current);
          } else {
            // Don't pass coordinates for global mouse up
            tool.onMouseUp(toolStateRef.current);
          }
          draw();
        }
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [selectedTool, toolMap, toolStateRef, draw]);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);



  // Keyboard pan: arrow keys nudge view in cell units
  useEffect(() => {
    const onKeyDown = (e) => {
      const amount = e.shiftKey ? KEYBOARD_PAN_AMOUNT_SHIFT : KEYBOARD_PAN_AMOUNT;
      if (e.key === 'ArrowLeft') {
        offsetRef.current.x -= amount;
        draw();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        offsetRef.current.x += amount;
        draw();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        offsetRef.current.y -= amount;
        draw();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        offsetRef.current.y += amount;
        draw();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [draw, offsetRef]);

  // Panning helper removed.

  return (
    <div className="canvas-container">
      {/* Left-side recent shapes strip */}
      <div className="recent-shapes" style={{ position: 'absolute', left: RECENT_SHAPES_LEFT_OFFSET, top: RECENT_SHAPES_TOP_OFFSET, zIndex: RECENT_SHAPES_Z_INDEX }}>
        <RecentShapesStrip 
          recentShapes={recentShapes}
          selectShape={selectShape}
          drawWithOverlay={draw}
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
        setIsRunning={setIsRunning}
        step={stepWithGeneration}
        draw={draw}
        clear={clearWithGeneration}
        generation={generation}
        snapshotsRef={snapshotsRef}
        setSteadyInfo={setSteadyInfo}
        canvasRef={canvasRef}
        offsetRef={offsetRef}
        cellSize={cellSize}
        setCellAlive={setCellAlive}
        popHistoryRef={popHistoryRef}
        setShowChart={setShowChart}
        getLiveCells={getLiveCells}
        popWindowSize={popWindowSize}
        setPopWindowSize={setPopWindowSize}
        popTolerance={popTolerance}
        setPopTolerance={setPopTolerance}
        selectShape={selectShape}
        selectedShape={selectedShape}
        drawWithOverlay={draw}
        openPalette={openPalette}
        steadyInfo={steadyInfo}
        toolStateRef={toolStateRef}
        cursorCell={cursorCell}
        onLoadGrid={handleLoadGrid}
        // Performance props
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
        onClick={handleCanvasClick}
        onContextMenu={(e) => { e?.preventDefault?.(); }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: (selectedShape || selectedTool) ? 'crosshair' : 'default' }}
      />
      {showChart && (
        <PopulationChart 
          history={popHistoryRef.current.slice()} 
          onClose={() => setShowChart(false)}
          isRunning={isRunning}
        />
      )}
      
      <SpeedGauge
        isVisible={showSpeedGauge}
        generation={generation}
        liveCellsCount={getLiveCells().size || 0}
        onToggleVisibility={setShowSpeedGauge}
        position={{ top: 10, right: 10 }}
      />
    </div>
  );
};

export default GameOfLife;
