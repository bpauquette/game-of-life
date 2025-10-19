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
import Tooltip from '@mui/material/Tooltip';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ShapePaletteDialog from './ShapePaletteDialog';

// Constants to avoid magic numbers
const DEFAULT_POPULATION_WINDOW_SIZE = 50;
const DEFAULT_POPULATION_TOLERANCE = 3;
const MAX_POPULATION_HISTORY = 1000;
const MAX_RECENT_SHAPES = 20;
const MAX_CELL_SIZE = 200;
const ZOOM_FACTOR = 1.12;
const RECENT_SHAPES_THUMBNAIL_SIZE = 48;
const KEYBOARD_PAN_AMOUNT = 1;
const KEYBOARD_PAN_AMOUNT_SHIFT = 10;
const SHAPE_PREVIEW_ALPHA = 0.45;
const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const RECENT_SHAPES_LEFT_OFFSET = 8;
const RECENT_SHAPES_TOP_OFFSET = 80;
const RECENT_SHAPES_Z_INDEX = 20;


const GameOfLife = () => {
  const canvasRef = useRef(null);
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

  // Panning refs (pixel-based offsets used by existing drawing semantics)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

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
  const scheduleCursorUpdate = (cell) => {
    latestCursorRef.current = cell;
    if (rafCursorRef.current) return;
    rafCursorRef.current = requestAnimationFrame(() => {
      setCursorCell(latestCursorRef.current);
      rafCursorRef.current = null;
    });
  };

  // local state: keeps a small flag so initial resize happens after draw is defined
  const [ready, setReady] = useState(false);

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

  // Shapes menu removed — selection is handled via palette or recent strip
  // recent shapes (last 20 selected)
  const [recentShapes, setRecentShapes] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const prevToolRef = useRef(null);


  // Draw function (keeps your original rendering)
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef) return;
    const ctx = canvasRef.current.getContext('2d');
    const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);

    // Use the current color scheme
    ctx.fillStyle = colorScheme.background;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw live cells
    drawLiveCells(ctx, getLiveCells(), computedOffset, cellSize, colorScheme);
  }, [getLiveCells, cellSize, offsetRef, colorScheme]);

  // Enhanced draw: call tool overlay draw after main render
  const drawWithOverlay = useCallback(() => {
    draw();
    try {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && selectedTool && offsetRef?.current) {
        const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);
        const tool = toolMap[selectedTool];
        if (tool?.drawOverlay) {
          tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset, colorScheme);
        }
        // Draw selected-shape preview if present. This is a non-committing
        // overlay drawn from the non-reactive toolStateRef so it remains fast.
        const selShape = toolStateRef.current.selectedShapeData || selectedShape;
        const last = toolStateRef.current.last;
        if (selShape && last) {
          // resolve cells from shape object or array
          const cells = Array.isArray(selShape) ? selShape : selShape?.cells || [];

          if (cells && cells.length > 0) {
            ctx.save();
            ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
            for (let i = 0; i < cells.length; i++) {
              const c = cells[i];
              const cx = (c.x !== undefined) ? c.x : c[0];
              const cy = (c.y !== undefined) ? c.y : c[1];
              const drawX = (last.x + cx) * cellSize - computedOffset.x;
              const drawY = (last.y + cy) * cellSize - computedOffset.y;
              try {
                ctx.fillStyle = colorScheme?.getCellColor?.(last.x + cx, last.y + cy) ?? '#222';
              } catch (err) {
                ctx.fillStyle = '#222';
              }
              ctx.fillRect(drawX, drawY, cellSize, cellSize);
            }
            ctx.restore();
          }
        }
      }
      } catch (err) {
        // overlay drawing should never break main render
        // Log for development debugging but don't disrupt production
        logger.warn('Overlay rendering failed:', err);
      }
    }, [draw, selectedTool, cellSize, offsetRef, toolMap, colorScheme, selectedShape]);  // Resize canvas to fill window and account for devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = (globalThis.window?.devicePixelRatio) || 1;
    const logicalWidth = globalThis.window?.innerWidth || DEFAULT_WINDOW_WIDTH;
    const logicalHeight = globalThis.window?.innerHeight || DEFAULT_WINDOW_HEIGHT;

    // set CSS size (so canvas looks correct in layout)
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    // set actual pixel buffer size for crispness
    canvas.width = Math.max(1, Math.floor(logicalWidth * dpr));
    canvas.height = Math.max(1, Math.floor(logicalHeight * dpr));

    const ctx = canvas.getContext('2d');
    // Reset transform and scale to logical coordinate system if available.
    // Some test environments (jsdom) provide a mock context without setTransform.
    if (ctx?.setTransform) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (ctx?.scale) {
      // Fallback: scale the context if setTransform isn't available
      ctx.scale(dpr, dpr);
    }

    // Redraw after resize
    drawWithOverlay();
  }, [drawWithOverlay]);

  // Initial resize + listener
  useEffect(() => {
    // mark ready after first render so draw exists for resizeCanvas
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // initial size and subscribe
    resizeCanvas();
    globalThis.window.addEventListener('resize', resizeCanvas);
    return () => globalThis.window.removeEventListener('resize', resizeCanvas);
  }, [ready, resizeCanvas]);

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
  }, [getLiveCells, createSnapshot, findSnapshotMatch, popWindowSize, popTolerance, setIsRunning]);

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

  

  // Canvas click: toggle or place shape
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !offsetRef?.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // compute cell relative to canvas center (center is world origin)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = Math.floor(offsetRef.current.x + (e.clientX - rect.left - centerX) / cellSize);
    const y = Math.floor(offsetRef.current.y + (e.clientY - rect.top - centerY) / cellSize);

  // Ignore direct click-toggle behavior for drawing tools. Shape placement is
  // handled on mouseup by the palette tool, so clicks do nothing here.
  if (selectedTool && selectedTool !== 'palette') return;
  if (selectedTool === 'palette') return;

  // Default click behavior toggles a single cell when no shape placement
  // is intended.
  const liveMap = getLiveCells();
  setCellAlive(x, y, !liveMap.has(`${x},${y}`));
    drawWithOverlay();
  };

  // Helper to convert mouse event to cell coordinates
  const eventToCell = (e) => {
    return eventToCellFromCanvas(e, canvasRef.current, offsetRef, cellSize);
  };

  // Helper functions for mouse handling
  const startPanning = useCallback((e) => {
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { x: offsetRef.current.x, y: offsetRef.current.y };
    if (e.preventDefault) e.preventDefault();
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* setPointerCapture not supported */ }
  }, []);

  const shouldStartPanning = useCallback((e) => {
    return (e.button === 1) || (e.button === 0 && e.nativeEvent && e.nativeEvent.shiftKey);
  }, []);

  const handleToolMouseDown = useCallback((e) => {
    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    tool.onMouseDown?.(toolStateRef.current, pt.x, pt.y);
    tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  }, [toolMap, selectedTool, eventToCell, scheduleCursorUpdate, setCellAlive, drawWithOverlay]);

  // Mouse handlers to support tools (freehand draw)
  const handleMouseDown = useCallback((e) => {
    if (shouldStartPanning(e)) {
      startPanning(e);
      return;
    }
    handleToolMouseDown(e);
  }, [shouldStartPanning, startPanning, handleToolMouseDown]);

  const updatePanning = useCallback((e) => {
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const dxCells = dx / cellSize;
    const dyCells = dy / cellSize;
    offsetRef.current.x = panOffsetStartRef.current.x - dxCells;
    offsetRef.current.y = panOffsetStartRef.current.y - dyCells;
    drawWithOverlay();
    if (e.preventDefault) e.preventDefault();
  }, [cellSize, drawWithOverlay]);

  const handleShapeToolMove = useCallback((e, tool, pt) => {
    toolStateRef.current.last = { x: pt.x, y: pt.y };
    tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  }, [setCellAlive, drawWithOverlay]);

  const shouldToolMove = useCallback((e) => {
    return (e.buttons & 1) || toolStateRef.current.last || toolStateRef.current.start;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isPanningRef.current) {
      updatePanning(e);
      return;
    }

    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    const tool = toolMap[selectedTool];
    if (!tool) return;

    if (selectedTool === 'shapes') {
      handleShapeToolMove(e, tool, pt);
      return;
    }

    if (!shouldToolMove(e)) return;

    tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    drawWithOverlay();
  }, [updatePanning, eventToCell, scheduleCursorUpdate, toolMap, selectedTool, handleShapeToolMove, shouldToolMove, setCellAlive, drawWithOverlay]);

  const stopPanning = useCallback((e) => {
    isPanningRef.current = false;
    try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* releasePointerCapture not supported */ }
    if (e.preventDefault) e.preventDefault();
  }, []);

  const handleToolMouseUp = useCallback((e) => {
    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    const x = pt ? pt.x : toolStateRef.current.last?.x;
    const y = pt ? pt.y : toolStateRef.current.last?.y;
    tool.onMouseUp?.(toolStateRef.current, x, y, setCellAlive, placeShape);
    drawWithOverlay();
  }, [toolMap, selectedTool, eventToCell, setCellAlive, placeShape, drawWithOverlay]);

  const handleMouseUp = useCallback((e) => {
    if (isPanningRef.current) {
      stopPanning(e);
      return;
    }
    handleToolMouseUp(e);
  }, [stopPanning, handleToolMouseUp]);

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

  // Helper functions for shape selection
  const generateShapeKey = useCallback((shape) => {
    if (shape && shape.id) return String(shape.id);
    if (typeof shape === 'string') return shape;
    return JSON.stringify(shape);
  }, []);

  const updateRecentShapesList = useCallback((newShape) => {
    setRecentShapes(prev => {
      const newKey = generateShapeKey(newShape);
      const filtered = prev.filter(shape => generateShapeKey(shape) !== newKey);
      return [newShape, ...filtered].slice(0, MAX_RECENT_SHAPES);
    });
  }, [generateShapeKey]);

  const updateShapeState = useCallback((shape) => {
    const normalizedShape = shape || null;
    setSelectedShape?.(normalizedShape);
    toolStateRef.current.selectedShapeData = normalizedShape;
  }, [setSelectedShape]);

  // Centralized shape selection helper: sets the selected shape, updates the tool
  // state and maintains the recent-shapes list in one place.
  const selectShape = useCallback((shape) => {
    updateShapeState(shape);
    if (shape) {
      updateRecentShapesList(shape);
    }
    drawWithOverlay();
  }, [updateShapeState, updateRecentShapesList, drawWithOverlay]);

  const openPalette = useCallback(() => {
    prevToolRef.current = selectedTool;
    // activate shapes tool while the palette is open so previews work
    setSelectedTool && setSelectedTool('shapes');
    setPaletteOpen(true);
  }, [selectedTool, setSelectedTool]);

  const closePalette = useCallback((restorePrev = true) => {
    setPaletteOpen(false);
    if (restorePrev && prevToolRef.current) setSelectedTool && setSelectedTool(prevToolRef.current);
    prevToolRef.current = null;
  }, [setSelectedTool]);

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
          onSelectShape={(shape) => { selectShape(shape); closePalette(false); }}
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
        <PopulationChart history={popHistoryRef.current.slice()} onClose={() => setShowChart(false)} />
      )}
      {/* Run-state indicator (top-right overlay) - lights while running, dark when stopped */}
      <div className="steady-indicator" title={isRunning ? 'Running' : 'Stopped'}>
        <Tooltip title={isRunning ? 'Running' : 'Stopped'}>
          <LightbulbIcon style={{ color: isRunning ? '#FFC107' : 'rgba(255,255,255,0.35)' }} />
        </Tooltip>
      </div>
    </div>
  );
};

export default GameOfLife;
