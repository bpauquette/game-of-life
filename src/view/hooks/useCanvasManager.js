import { useState, useRef, useCallback, useEffect } from 'react';
import { eventToCellFromCanvas, computeComputedOffset, drawLiveCells } from '../../controller/utils/canvasUtils';

const CONST_CAPTURE = 'capture';

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;
const SHAPE_PREVIEW_ALPHA = 0.6;

/**
 * Custom hook for managing canvas operations, drawing, and mouse interactions.
 * 
 * @param {Object} params - Configuration object
 * @param {Function} params.getLiveCells - Function to get live cells
 * @param {number} params.cellSize - Size of each cell in pixels
 * @param {Object} params.offsetRef - Ref containing x,y offset for panning
 * @param {Object} params.colorScheme - Color scheme for rendering
 * @param {string} params.selectedTool - Currently selected tool
 * @param {Object} params.toolMap - Map of available tools
 * @param {Object} params.toolStateRef - Ref for tool state
 * @param {Function} params.setCellAlive - Function to set cell alive/dead
 * @param {Function} params.scheduleCursorUpdate - Function to update cursor position
 * @param {Object} params.selectedShape - Currently selected shape for placement
 * @param {Function} params.placeShape - Function to place a shape at coordinates
 * @param {Object} params.logger - Logger instance for debugging
 * 
 * @returns {Object} Canvas manager interface
 */
export const useCanvasManager = ({
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
}) => {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  
  // Panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  // Draw function - renders the game state
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef) return;
    const ctx = canvasRef.current.getContext('2d');
    const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);

    // Use the current color scheme
    ctx.fillStyle = colorScheme?.background || '#000000';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw live cells
    drawLiveCells(ctx, getLiveCells(), computedOffset, cellSize, colorScheme);
  }, [getLiveCells, cellSize, offsetRef, colorScheme]);

  // Enhanced draw: call tool overlay draw after main render
  // Helper function to draw shape preview overlay
  const drawShapePreview = useCallback((ctx, selShape, last, computedOffset) => {
    const cells = Array.isArray(selShape) ? selShape : selShape?.cells || [];
    if (!cells?.length) return;

    ctx.save();
    ctx.globalAlpha = SHAPE_PREVIEW_ALPHA;
    
    for (const element of cells) {
      const c = element;
      const cx = (c.x === undefined) ? c[0] : c.x;
      const cy = (c.y === undefined) ? c[1] : c.y;
      const drawX = (last.x + cx) * cellSize - computedOffset.x;
      const drawY = (last.y + cy) * cellSize - computedOffset.y;
      
      try {
        ctx.fillStyle = colorScheme?.getCellColor?.(last.x + cx, last.y + cy) ?? '#222';
      } catch (err) {
        logger.warn(err);
        ctx.fillStyle = '#222';
      }
      ctx.fillRect(drawX, drawY, cellSize, cellSize);
    }
    ctx.restore();
  }, [cellSize, colorScheme, logger]);

  // Helper function to draw tool overlays
  const drawToolOverlay = useCallback((ctx, computedOffset) => {
    const tool = toolMap[selectedTool];
    if (tool?.drawOverlay) {
      tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset, colorScheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolMap, selectedTool, cellSize, colorScheme]);

  const drawWithOverlay = useCallback(() => {
    draw();
    
    try {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !selectedTool || !offsetRef?.current) return;

      const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);
      
      // Draw tool overlay
      drawToolOverlay(ctx, computedOffset);
      
      // Draw shape preview if shapes tool is active
      if (selectedTool === 'shapes') {
        const selShape = toolStateRef.current.selectedShapeData || selectedShape;
        const last = toolStateRef.current.last;
        if (selShape && last) {
          drawShapePreview(ctx, selShape, last, computedOffset);
        }
      }
    } catch (err) {
      // overlay drawing should never break main render
      logger.warn('Overlay rendering failed:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, selectedTool, cellSize, offsetRef, drawToolOverlay, drawShapePreview, selectedShape, logger]);

  // Resize canvas to fill window and account for devicePixelRatio
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

  // Helper to convert mouse event to cell coordinates
  const eventToCell = useCallback((e) => {
    return eventToCellFromCanvas(e, canvasRef.current, offsetRef, cellSize);
  }, [offsetRef, cellSize]);

  // Canvas click: toggle or place shape
  const handleCanvasClick = useCallback((e) => {
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
  }, [canvasRef, offsetRef, cellSize, selectedTool, getLiveCells, setCellAlive, drawWithOverlay]);

  // Panning helper functions
  const startPanning = useCallback((e) => {
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { x: offsetRef.current.x, y: offsetRef.current.y };
    if (e.preventDefault) e.preventDefault();
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* setPointerCapture not supported */ }
  }, [offsetRef]);

  const shouldStartPanning = useCallback((e) => {
    return (e.button === 1) || (e.button === 0 && e.nativeEvent?.shiftKey);
  }, []);

  const updatePanning = useCallback((e) => {
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const dxCells = dx / cellSize;
    const dyCells = dy / cellSize;
    offsetRef.current.x = panOffsetStartRef.current.x - dxCells;
    offsetRef.current.y = panOffsetStartRef.current.y - dyCells;
    drawWithOverlay();
    if (e.preventDefault) e.preventDefault();
  }, [cellSize, drawWithOverlay, offsetRef]);

  // Tool mouse handling
  const handleToolMouseDown = useCallback((e) => {
    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    tool.onMouseDown?.(toolStateRef.current, pt.x, pt.y);
    
    // Special handling for capture tool which needs getLiveCells
    if (selectedTool === CONST_CAPTURE) {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive, getLiveCells);
    } else {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    }
    
    drawWithOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolMap, selectedTool, eventToCell, scheduleCursorUpdate, setCellAlive, getLiveCells, drawWithOverlay]);

  const handleShapeToolMove = useCallback((e, tool, pt) => {
    if (!pt) return;
    toolStateRef.current.last = { x: pt.x, y: pt.y };
    
    // Special handling for capture tool which needs getLiveCells
    if (selectedTool === CONST_CAPTURE) {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive, getLiveCells);
    } else {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    }
    
    drawWithOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTool, setCellAlive, getLiveCells, drawWithOverlay]);

  const shouldToolMove = useCallback((e) => {
    return (e.buttons & 1) || toolStateRef.current.last || toolStateRef.current.start;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (shouldStartPanning(e)) {
      startPanning(e);
      return;
    }
    handleToolMouseDown(e);
  }, [shouldStartPanning, startPanning, handleToolMouseDown]);

  const handleMouseMove = useCallback((e) => {
    if (isPanningRef.current) {
      updatePanning(e);
      return;
    }

    const pt = eventToCell(e);
    if (pt) scheduleCursorUpdate(pt);

    const tool = toolMap[selectedTool];
    if (!tool) return;

    if (shouldToolMove(e)) {
      handleShapeToolMove(e, tool, pt);
    } else if (toolStateRef.current.last && pt) {
      toolStateRef.current.last = { x: pt.x, y: pt.y };
      drawWithOverlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventToCell, scheduleCursorUpdate, toolMap, selectedTool, shouldToolMove, handleShapeToolMove, drawWithOverlay, updatePanning]);

  const handleMouseUp = useCallback((e) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* releasePointerCapture not supported */ }
      return;
    }

    const tool = toolMap[selectedTool];
    if (!tool) return;

    const pt = eventToCell(e);
    if (pt) {
      // Special handling for capture tool which needs getLiveCells and tool object
      if (selectedTool === CONST_CAPTURE) {
        tool.onMouseUp?.(toolStateRef.current, pt.x, pt.y, setCellAlive, getLiveCells, tool);
      } else {
        tool.onMouseUp?.(toolStateRef.current, pt.x, pt.y, setCellAlive, placeShape);
      }
      drawWithOverlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolMap, selectedTool, eventToCell, setCellAlive, placeShape, getLiveCells, drawWithOverlay]);

  // Initial setup and resize handling
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

  return {
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
  };
};

export default useCanvasManager;