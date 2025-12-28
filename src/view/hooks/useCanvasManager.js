import { useState, useRef, useCallback, useEffect } from 'react';
import { eventToCellFromCanvas, computeComputedOffset, drawLiveCells } from '../../controller/utils/canvasUtils';

const CONST_CAPTURE = 'capture';

const DEFAULT_WINDOW_WIDTH = 800;
const DEFAULT_WINDOW_HEIGHT = 600;

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
  placeShape,
  logger
}) => {
  // Small helper to push debug messages into an on-page overlay buffer
  const pushDebug = (msg) => {
    try {
      const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
      // If a global push function exists (overlay mounted), use it and return its result
      if (globalThis.__GOL_PUSH_CANVAS_LOG__) {
        try {
          const res = globalThis.__GOL_PUSH_CANVAS_LOG__(text);
          return res ?? { ts: Date.now(), text };
        } catch (e) {
          // if the global push throws, fall back to buffer
        }
      }
      // Fallback: maintain a simple buffer and emit a global event that the overlay listens for
      const entry = { ts: Date.now(), text };
      globalThis.__GOL_CANVAS_LOGS__ = globalThis.__GOL_CANVAS_LOGS__ || [];
      globalThis.__GOL_CANVAS_LOGS__.push(entry);
      try { globalThis.dispatchEvent && globalThis.dispatchEvent(new CustomEvent('__GOL_CANVAS_LOG_UPDATE')); } catch (e) {}
      return entry;
    } catch (e) {
      // swallow and return null to indicate failure
      return null;
    }
  };

  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  // store last observed content rect from ResizeObserver (if available)
  const observedSizeRef = useRef(null);
  
  // Panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  // Draw function - renders the game state
  const draw = useCallback(() => {
    if (!canvasRef.current || !offsetRef) return;
    const ctx = canvasRef.current.getContext && canvasRef.current.getContext('2d');
    if (!ctx) return;
    const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);

    // Use the current color scheme
    ctx.fillStyle = colorScheme?.background || '#000000';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw live cells
    drawLiveCells(ctx, getLiveCells(), computedOffset, cellSize, colorScheme);
  }, [getLiveCells, cellSize, offsetRef, colorScheme]);

  // Helper function to draw tool overlays
  const drawToolOverlay = useCallback((ctx, computedOffset) => {
    const tool = toolMap[selectedTool];
    if (tool?.drawOverlay) {
      tool.drawOverlay(ctx, toolStateRef.current, cellSize, computedOffset, colorScheme);
    }
  }, [toolMap, selectedTool, cellSize, toolStateRef, colorScheme]);

  const drawWithOverlay = useCallback(() => {
    draw();
    
    try {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !selectedTool || !offsetRef?.current) return;

      const computedOffset = computeComputedOffset(canvasRef.current, offsetRef, cellSize);
      
      // Draw tool overlay
      drawToolOverlay(ctx, computedOffset);
    } catch (err) {
      // overlay drawing should never break main render
      logger.warn('Overlay rendering failed:', err);
    }
  }, [draw, selectedTool, cellSize, offsetRef, drawToolOverlay, toolStateRef, logger]);

  // Resize canvas to fill window and account for devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Diagnostic logging only when enabled via global flag to avoid spamming
    try {
      const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
      if (DBG) {
        console?.warn?.('[useCanvasManager] resizeCanvas invoked');
        if (typeof pushDebug === 'function') pushDebug('[useCanvasManager] resizeCanvas invoked');
      }
    } catch (e) {}

    const dpr = (globalThis.window?.devicePixelRatio) || 1;
    // Prefer the canvas's actual layout rect when available (most robust across browsers)
    // This avoids observing a parent element that may not reflect the canvas' final
    // visual size (fixed positioning / stacking contexts can make parent sizes
    // meaningless in some browsers like Chrome).
    let logicalWidth = DEFAULT_WINDOW_WIDTH;
    let logicalHeight = DEFAULT_WINDOW_HEIGHT;
    try {
      const rect = canvas.getBoundingClientRect();
      if (rect && rect.width && rect.height) {
        logicalWidth = Math.max(1, Math.floor(rect.width));
        logicalHeight = Math.max(1, Math.floor(rect.height));
      } else if (observedSizeRef.current) {
        logicalWidth = observedSizeRef.current.width;
        logicalHeight = observedSizeRef.current.height;
      } else {
        logicalWidth = globalThis.window?.innerWidth || DEFAULT_WINDOW_WIDTH;
        logicalHeight = globalThis.window?.innerHeight || DEFAULT_WINDOW_HEIGHT;
      }
    } catch (err) {
      logicalWidth = (observedSizeRef.current && observedSizeRef.current.width) || globalThis.window?.innerWidth || DEFAULT_WINDOW_WIDTH;
      logicalHeight = (observedSizeRef.current && observedSizeRef.current.height) || globalThis.window?.innerHeight || DEFAULT_WINDOW_HEIGHT;
    }

    // Debugging: print layout and sizing information when enabled at runtime.
    try {
      const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
      if (DBG) {
        const dpr = (globalThis.window?.devicePixelRatio) || 1;
        // canvas.clientWidth/Height may be fractional; getBoundingClientRect used above
        const clientRect = canvas.getBoundingClientRect();
        // Use info level to ensure visibility in Chrome DevTools (debug may be filtered)
        const info = {
          dpr,
          clientWidth: clientRect?.width,
          clientHeight: clientRect?.height,
          observedSize: observedSizeRef.current,
          chosenLogical: { logicalWidth, logicalHeight }
        };
        console.info('[useCanvasManager] resizeCanvas', info);
        pushDebug && pushDebug('[useCanvasManager] resizeCanvas ' + JSON.stringify(info));
      }
    } catch (err) {
      // ignore debug logging errors
    }

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
    try {
      const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
      if (DBG) {
        const before = { width: canvas.width, height: canvas.height };
        drawWithOverlay();
        const after = { width: canvas.width, height: canvas.height };
        console.info('[useCanvasManager] drawWithOverlay after resize', { before, after });
        pushDebug && pushDebug('[useCanvasManager] drawWithOverlay after resize: ' + JSON.stringify({ before, after }));
      } else {
        drawWithOverlay();
      }
    } catch (err) {
      // don't let drawing errors bubble
      try { console.error && console.error('drawWithOverlay failed after resize', err); } catch (e) {}
    }
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

    // Ensure toolState carries fractional coords so overlays can render
    // crosshairs even if the pointer leaves the canvas or stops moving.
    toolStateRef.current.last = { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy };
    tool.onMouseDown?.(toolStateRef.current, pt.x, pt.y);
    
    // Special handling for capture tool which needs getLiveCells
    if (selectedTool === CONST_CAPTURE) {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive, getLiveCells);
    } else {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    }
    
    drawWithOverlay();
   
  }, [toolMap, selectedTool, eventToCell, scheduleCursorUpdate, setCellAlive, getLiveCells, drawWithOverlay, toolStateRef]);

  const handleShapeToolMove = useCallback((e, tool, pt) => {
    if (!pt) return;
    toolStateRef.current.last = { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy };
    
    // Special handling for capture tool which needs getLiveCells
    if (selectedTool === CONST_CAPTURE) {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive, getLiveCells);
    } else {
      tool.onMouseMove?.(toolStateRef.current, pt.x, pt.y, setCellAlive);
    }
    
    drawWithOverlay();
    
  }, [selectedTool, setCellAlive, getLiveCells, drawWithOverlay, toolStateRef]);

  const shouldToolMove = useCallback((e) => {
    return (e.buttons & 1) || toolStateRef.current.last || toolStateRef.current.start;
    
  }, [toolStateRef]);

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
      toolStateRef.current.last = { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy };
      drawWithOverlay();
    }
    
  }, [eventToCell, scheduleCursorUpdate, toolMap, selectedTool, shouldToolMove, handleShapeToolMove, drawWithOverlay, updatePanning, toolStateRef]);

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
    
  }, [toolMap, selectedTool, eventToCell, setCellAlive, placeShape, getLiveCells, drawWithOverlay, toolStateRef]);

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

    // Setup ResizeObserver on the canvas container to automatically resize when
    // layout changes (e.g., header hide/show). If ResizeObserver is unavailable
    // fall back to window resize events only.
    let ro;
    try {
      if (typeof globalThis.ResizeObserver !== 'undefined') {
        ro = new globalThis.ResizeObserver((entries) => {
          try {
                // ResizeObserver log only when debug flag is set
                try {
                  const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
                  if (DBG) {
                    console.warn && console.warn('[useCanvasManager] ResizeObserver callback', entries && entries[0] ? Object.keys(entries[0]) : entries);
                    pushDebug && pushDebug('[useCanvasManager] ResizeObserver callback');
                  }
                } catch (e) {}
            // Use requestAnimationFrame to ensure layout has stabilized in the
            // browser before reading bounding rects. Some browsers (Chrome)
            // may schedule RO callbacks before final layout is committed.
            requestAnimationFrame(() => {
              const entry = entries && entries[0];
              let width = 0; let height = 0;
              if (entry && entry.contentRect) {
                width = entry.contentRect.width || 0;
                height = entry.contentRect.height || 0;
              }
              // If contentRect isn't available (some RO implementations), prefer
              // to read the canvas's own boundingClientRect which reflects the
              // visual size we care about.
              if ((!width || !height) && canvasRef.current) {
                const b = canvasRef.current.getBoundingClientRect();
                width = b.width || width;
                height = b.height || height;
              }
              if (width && height) {
                observedSizeRef.current = { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
                if (Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS)) pushDebug && pushDebug('[useCanvasManager] ResizeObserver observed size ' + JSON.stringify(observedSizeRef.current));
                resizeCanvas();
              } else {
                try {
                  const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
                  if (DBG) console.warn && console.warn('[useCanvasManager] ResizeObserver produced empty rect, canvas rect:', canvasRef.current && canvasRef.current.getBoundingClientRect());
                  if (DBG) pushDebug && pushDebug('[useCanvasManager] ResizeObserver produced empty rect');
                } catch (e) {}
              }
            });
          } catch (err) {
            // swallow observer errors to avoid breaking the app
          }
        });
        const el = canvasRef.current || null;
        if (el) ro.observe(el);
      }
    } catch (err) {
      // ignore
    }

    return () => {
      globalThis.window.removeEventListener('resize', resizeCanvas);
      try { if (ro) ro.disconnect(); } catch (e) { /* ignore */ }
    };
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