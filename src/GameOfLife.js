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
import logger from './utils/logger';
import './GameOfLife.css';
import PopulationChart from './PopulationChart';
import ControlsBar from './ControlsBar';
import RecentShapesStrip from './RecentShapesStrip';
import { computeComputedOffset, eventToCellFromCanvas, drawLiveCells } from './utils/canvasUtils';
import ShapePaletteDialog from './ShapePaletteDialog';
import { useCanvasManager } from './hooks/useCanvasManager';
import { useShapeManager } from './hooks/useShapeManager';

// Constants to avoid magic numbers
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const MAX_POPULATION_HISTORY = 1000;
const MAX_CELL_SIZE = 200;
const ZOOM_FACTOR = 1.12;
const KEYBOARD_PAN_AMOUNT = 1;
const KEYBOARD_PAN_AMOUNT_SHIFT = 10;
const SHAPE_PREVIEW_ALPHA = 0.45;
const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const RECENT_SHAPES_LEFT_OFFSET = 8;
const RECENT_SHAPES_TOP_OFFSET = 80;
const RECENT_SHAPES_Z_INDEX = 20;


const GameOfLife = () => {
  const animationRef = useRef(null);
  

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

  // population stability checker moved to src/utils/populationUtils.js

  // Tool selection (e.g. freehand draw)
  // default to freehand draw so UI doesn't show an empty "None" selection
  const [selectedTool, setSelectedTool] = React.useState('draw');
  const toolStateRef = useRef({});

  const toolMap = useMemo(() => ({
    draw: drawTool,
    line: lineTool,
    rect: rectTool,
    circle: circleTool,
    oval: ovalTool,
    randomRect: randomRectTool
    ,
    shapes: shapesTool
  }), []);

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
    ready,
    setReady,
    draw,
    drawWithOverlay,
    resizeCanvas,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    eventToCell
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
    logger
  });

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
    drawWithOverlay
  });

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
    const keys = Array.from(liveMap.keys()).sort();
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
      } else if (matchIdx === 0) {
        detected = true;
        detectedPeriod = 1;
      } else if (matchIdx > 0) {
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
  }, [getLiveCells, createSnapshot, findSnapshotMatch, popWindowSize, popTolerance, setIsRunning, setSteadyInfo, logger]);

  // Game loop
  useEffect(() => {
    const loop = () => {
      if (isRunning) {
        step();
        updatePopulationHistory();
        updateSteadyState();
        drawWithOverlay();
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    if (isRunning) animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, step, drawWithOverlay, updatePopulationHistory, updateSteadyState]);



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
    let snappedDevice = Math.round(newDevice);
    
    if (newDevice > prevDevice) snappedDevice = Math.ceil(newDevice);
    else snappedDevice = Math.floor(newDevice);
    
    snappedDevice = Math.max(1, Math.min(Math.round(maxDevice), snappedDevice));
    const snappedSize = Math.max(minCellSize, snappedDevice / dpr);
    
    return snappedSize === currentSize ? currentSize : snappedSize;
  }, []);

  const handleWheelZoom = useCallback((e) => {
    setCellSize(prev => calculateNewCellSize(prev, e.deltaY));
    if (e.cancelable) e.preventDefault();
    drawWithOverlay();
  }, [setCellSize, calculateNewCellSize, drawWithOverlay]);

  // Mouse wheel: adjust cell size (zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelZoom, { passive: false });
  }, [handleWheelZoom]);

  // shapes menu removed: no context menu handler

  // Initial draw
  useEffect(() => { drawWithOverlay(); }, [drawWithOverlay]);



  // Keyboard pan: arrow keys nudge view in cell units
  useEffect(() => {
    const onKeyDown = (e) => {
      const amount = e.shiftKey ? KEYBOARD_PAN_AMOUNT_SHIFT : KEYBOARD_PAN_AMOUNT;
      if (e.key === 'ArrowLeft') {
        offsetRef.current.x -= amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        offsetRef.current.x += amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        offsetRef.current.y -= amount;
        drawWithOverlay();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        offsetRef.current.y += amount;
        drawWithOverlay();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawWithOverlay, offsetRef]);

  // Panning helper removed.

  return (
    <div className="canvas-container">
      {/* Left-side recent shapes strip */}
      <div className="recent-shapes" style={{ position: 'absolute', left: RECENT_SHAPES_LEFT_OFFSET, top: RECENT_SHAPES_TOP_OFFSET, zIndex: RECENT_SHAPES_Z_INDEX }}>
        <RecentShapesStrip 
          recentShapes={recentShapes}
          selectShape={selectShape}
          drawWithOverlay={drawWithOverlay}
          colorScheme={colorScheme}
        />
      </div>
      <ControlsBar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        colorSchemeKey={colorSchemeKey}
        setColorSchemeKey={setColorSchemeKey}
        colorSchemes={colorSchemes}
        isRunning={isRunning}
        setIsRunning={(v) => { if (!v) {} ; setIsRunning(v); }}
        step={step}
        draw={draw}
        clear={clear}
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
        drawWithOverlay={drawWithOverlay}
        openPalette={openPalette}
        steadyInfo={steadyInfo}
        toolStateRef={toolStateRef}
        cursorCell={cursorCell}
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

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onContextMenu={(e) => { if (e && e.preventDefault) e.preventDefault(); }}
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
    </div>
  );
};

export default GameOfLife;
