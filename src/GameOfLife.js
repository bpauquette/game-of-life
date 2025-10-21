// GameOfLife.js
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
// shapes list removed from frontend; shape data is provided by palette or backend
import { useChunkedGameState } from './chunkedGameState';
import { colorSchemes } from './colorSchemes';
import isPopulationStable from './utils/populationUtils';
import { drawTool } from './tools/drawTool';
import { lineTool } from './tools/lineTool';
import { rectTool } from './tools/rectTool';
import { circleTool } from './tools/circleTool';
import { ovalTool } from './tools/ovalTool';
import { randomRectTool } from './tools/randomRectTool';
import { shapesTool } from './tools/shapesTool';
import { captureTool } from './tools/captureTool';
import logger from './utils/logger';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';
import ControlsBar from './ControlsBar';
import RecentShapesStrip from './RecentShapesStrip';
// Removed unused imports: computeComputedOffset, eventToCellFromCanvas, drawLiveCells
import ShapePaletteDialog from './ShapePaletteDialog';
import CaptureShapeDialog from './CaptureShapeDialog';
import { useCanvasManager } from './hooks/useCanvasManager';
import { useShapeManager } from './hooks/useShapeManager';
import SpeedGauge from './SpeedGauge';
import { drawScene } from './enhancedRenderer';
import { usePerformanceMonitor } from './optimizedEngine';
import { computeComputedOffset } from './utils/canvasUtils';

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

  // Canvas management hook - handles all canvas operations and mouse interactions
  const {
    canvasRef,
    // ready, setReady, resizeCanvas, eventToCell - unused variables removed
    draw,
    drawWithOverlay,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  } = useCanvasManager({
    getLiveCells,
    cellSize,
    offsetRef,
    colorScheme,
    selectedTool,
    toolMap,
    toolStateRef,
    setCellAlive,
    scheduleCursorUpdate,
    selectedShape,
    placeShape,
    logger
  });

  // Enhanced drawing function with optimization support
  const drawWithEnhancedOverlay = useCallback(() => {
    if (!canvasRef?.current) return;
    
    const startTime = performance.now();
    const ctx = canvasRef.current.getContext('2d');
    
    // Update live cells ref just before drawing
    const liveCells = getLiveCells();
    liveCellsRef.current = liveCells;
    
    // Use unified enhanced renderer with performance optimizations
    drawScene(ctx, { 
      liveCellsRef, 
      offsetRef, 
      cellSizePx: cellSize 
    });
    
    // Draw tool overlays on top
    const tool = toolMap[selectedTool];
    if (tool?.drawOverlay) {
      try {
        const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);
        tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset, colorScheme);
      } catch (err) {
        logger.warn('Tool overlay draw failed:', err);
      }
    }
    
    const renderTime = performance.now() - startTime;
    trackFrame(renderTime);
    
    // Also notify SpeedGauge tracker if available
    if (window.speedGaugeTracker) {
      window.speedGaugeTracker(renderTime, renderTime);
    }
  }, [canvasRef, cellSize, trackFrame, getLiveCells, offsetRef, toolMap, selectedTool, toolStateRef, colorScheme]);

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
    drawWithOverlay: drawWithEnhancedOverlay
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
      drawWithEnhancedOverlay();
      
      logger.info(`Loaded grid with ${liveCells ? liveCells.size : 0} live cells`);
    } catch (error) {
      logger.error('Failed to load grid:', error);
    }
  }, [clearWithGeneration, setCellAlive, drawWithEnhancedOverlay]);

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
        drawWithEnhancedOverlay();
        requestAnimationFrame(loop);
      }
    };
    
    const rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, step, updatePopulationHistory, updateSteadyState, drawWithEnhancedOverlay]);



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
    const canvas = canvasRef.current;
    if (!canvas || !offsetRef?.current) return;

    const prevCellSize = cellSize;
    const newCellSize = calculateNewCellSize(prevCellSize, e.deltaY);
    
    if (newCellSize === prevCellSize) return; // No zoom change
    
    // Calculate mouse position relative to canvas center (center-based coordinate system)
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseCanvasX = e.clientX - rect.left - centerX;
    const mouseCanvasY = e.clientY - rect.top - centerY;
    
    // Calculate cell coordinate at mouse position before zoom
    const mouseCellX = offsetRef.current.x + mouseCanvasX / prevCellSize;
    const mouseCellY = offsetRef.current.y + mouseCanvasY / prevCellSize;
    
    // Update cell size
    setCellSize(newCellSize);
    
    // Adjust offset so the same cell stays under the mouse cursor
    const newMouseCanvasX = mouseCanvasX; // Mouse canvas position stays the same
    const newMouseCanvasY = mouseCanvasY;
    const newOffsetX = mouseCellX - newMouseCanvasX / newCellSize;
    const newOffsetY = mouseCellY - newMouseCanvasY / newCellSize;
    
    offsetRef.current = { x: newOffsetX, y: newOffsetY };
    
    if (e.cancelable) e.preventDefault();
    drawWithEnhancedOverlay();
  }, [canvasRef, cellSize, offsetRef, setCellSize, calculateNewCellSize, drawWithEnhancedOverlay]);

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelZoom, { passive: false });
  }, [handleWheelZoom, canvasRef]);

  // shapes menu removed: no context menu handler

  // Initial draw
  useEffect(() => { drawWithEnhancedOverlay(); }, [drawWithEnhancedOverlay]);



  // Keyboard pan: arrow keys nudge view in cell units
  useEffect(() => {
    const onKeyDown = (e) => {
      const amount = e.shiftKey ? KEYBOARD_PAN_AMOUNT_SHIFT : KEYBOARD_PAN_AMOUNT;
      if (e.key === 'ArrowLeft') {
        offsetRef.current.x -= amount;
        drawWithEnhancedOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        offsetRef.current.x += amount;
        drawWithEnhancedOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        offsetRef.current.y -= amount;
        drawWithEnhancedOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        offsetRef.current.y += amount;
        drawWithEnhancedOverlay();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawWithEnhancedOverlay, offsetRef]);

  // Panning helper removed.

  return (
    <div className="canvas-container">
      {/* Left-side recent shapes strip */}
      <div className="recent-shapes" style={{ position: 'absolute', left: RECENT_SHAPES_LEFT_OFFSET, top: RECENT_SHAPES_TOP_OFFSET, zIndex: RECENT_SHAPES_Z_INDEX }}>
        <RecentShapesStrip 
          recentShapes={recentShapes}
          selectShape={selectShape}
          drawWithOverlay={drawWithEnhancedOverlay}
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
        drawWithOverlay={drawWithEnhancedOverlay}
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
