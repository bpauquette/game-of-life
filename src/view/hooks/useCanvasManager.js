import { useState, useRef, useCallback, useEffect } from 'react';
import { eventToCellFromCanvas } from '../../controller/utils/canvasUtils.js';
import { useToolDao } from '../../model/dao/toolDao.js';
import { useUiDao } from '../../model/dao/uiDao.js';
import { useGameDao } from '../../model/dao/gameDao.js';
import { useGameStore } from '../../store/useGameStore.js';

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
  offsetRef,
  canvasRef,
  gameRef
}) => {
  // Log selectedTool and toolMap on every render
  const selectedTool = useToolDao(state => state.selectedTool);
  const toolMap = useToolDao(state => state.toolMap);
  // DAO state selectors
  const cellSize = useUiDao(state => state.cellSize);
  let toolStateRef = useToolDao(state => state.toolStateRef);
  const setToolState = useToolDao(state => state.setToolState);
  // Defensive: always provide a valid ref object
  if (!toolStateRef || typeof toolStateRef !== 'object' || !('current' in toolStateRef)) {
    toolStateRef = { current: {} };
  }
  const getLiveCells = useGameDao(state => state.getLiveCells);
  const setCellAlive = useGameDao(state => state.setCellAlive);
  const scheduleCursorUpdate = useUiDao(state => state.scheduleCursorUpdate);
  const logger = useUiDao(state => state.logger);
  const getController = useCallback(() => (gameRef?.current?.controller || null), [gameRef]);
  // Use canvasRef directly; do not assign to a local variable to avoid prop mutation warnings
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
      try { globalThis.dispatchEvent && globalThis.dispatchEvent(new CustomEvent('__GOL_CANVAS_LOG_UPDATE')); } catch (e) { console.warn('Exception caught in pushCanvasLog (dispatchEvent):', e); }
      return entry;
    } catch (e) {
      // swallow and return null to indicate failure
      return null;
    }
  };

  // Canvas manager starts ready; no need for an extra effect-driven setState.
  const [ready, setReady] = useState(true);
  // store last observed content rect from ResizeObserver (if available)
  const observedSizeRef = useRef(null);
  // Remember last non-zero logical canvas size to avoid transient zero sizing
  const lastLogicalSizeRef = useRef({ width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT });
  // Coalesce overlay draws triggered by hover/move to avoid rapid full repaints
  const pendingOverlayFrame = useRef(null);

  // Wire cursor updates into both the model and the shared store so tools and
  // the status bar receive fresh coordinates from a single path.
  useEffect(() => {
    const setSchedule = useUiDao.getState()?.setScheduleCursorUpdate;
    if (typeof setSchedule !== 'function') return undefined;

    const updateCursor = (pt) => {
      try {
        useGameStore.getState()?.setCursorCell?.(pt || null);
      } catch (e) {
        console.error('setCursorCell failed', e);
      }
      try {
        gameRef?.current?.model?.setCursorPositionModel?.(pt || null);
      } catch (e) {
        console.error('setCursorPositionModel failed', e);
      }
    };

    setSchedule(updateCursor);
    return () => {
      try { setSchedule(() => {}); } catch (e) { console.error('reset scheduleCursorUpdate failed', e); }
    };
  }, [gameRef]);
  
  // Panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  // Draw function - delegate to the controller-driven renderer to avoid double-drawing.
  const draw = useCallback(() => {
    try {
      getController()?.requestRender?.();
    } catch (err) {
      console.error('draw requestRender failed', err);
    }
  }, [getController]);

  const drawWithOverlay = useCallback(() => {
    // Single render path: rely on controller/view renderer to draw cells and overlays.
    try {
      getController()?.requestRender?.();
    } catch (err) {
      if (logger) logger.warn('requestRender failed in drawWithOverlay', err);
    }
  }, [getController, logger]);

  const scheduleOverlayDraw = useCallback(() => {
    if (pendingOverlayFrame.current != null) return;
    pendingOverlayFrame.current = requestAnimationFrame(() => {
      pendingOverlayFrame.current = null;
      drawWithOverlay();
    });
  }, [drawWithOverlay]);

  // Resize canvas to fill globalThis and account for devicePixelRatio
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
    } catch (e) {
      // Intentionally ignored
    }

    const dpr = (globalThis.globalThis?.devicePixelRatio) || 1;
    // Prefer the canvas's actual layout rect when available (most robust across browsers)
    // This avoids observing a parent element that may not reflect the canvas' final
    // visual size (fixed positioning / stacking contexts can make parent sizes
    // meaningless in some browsers like Chrome).
    let logicalWidth = DEFAULT_WINDOW_WIDTH;
    let logicalHeight = DEFAULT_WINDOW_HEIGHT;
    try {
      const observed = observedSizeRef.current;
      const rect = canvas.getBoundingClientRect();
      if (observed && observed.width && observed.height) {
        logicalWidth = observed.width;
        logicalHeight = observed.height;
      } else if (rect && rect.width && rect.height) {
        logicalWidth = Math.max(1, Math.floor(rect.width));
        logicalHeight = Math.max(1, Math.floor(rect.height));
      } else {
        logicalWidth = globalThis.globalThis?.innerWidth || DEFAULT_WINDOW_WIDTH;
        logicalHeight = globalThis.globalThis?.innerHeight || DEFAULT_WINDOW_HEIGHT;
      }
    } catch (err) {
      logicalWidth = (observedSizeRef.current && observedSizeRef.current.width) || globalThis.globalThis?.innerWidth || DEFAULT_WINDOW_WIDTH;
      logicalHeight = (observedSizeRef.current && observedSizeRef.current.height) || globalThis.globalThis?.innerHeight || DEFAULT_WINDOW_HEIGHT;
    }

    // If we somehow got zero/NaN, fall back to last good size to prevent canvas collapse
    if (!Number.isFinite(logicalWidth) || logicalWidth <= 0) {
      logicalWidth = lastLogicalSizeRef.current.width || DEFAULT_WINDOW_WIDTH;
    }
    if (!Number.isFinite(logicalHeight) || logicalHeight <= 0) {
      logicalHeight = lastLogicalSizeRef.current.height || DEFAULT_WINDOW_HEIGHT;
    }
    lastLogicalSizeRef.current = { width: logicalWidth, height: logicalHeight };

    // Debugging: print layout and sizing information when enabled at runtime.
    try {
      const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
      if (DBG) {
        const dpr = (globalThis.globalThis?.devicePixelRatio) || 1;
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

    // Keep renderer viewport in sync with DOM size to prevent cursor/overlay drift.
    const renderer = gameRef?.current?.view?.renderer;
    if (renderer && typeof renderer.resize === 'function') {
      // Skip if nothing changed to avoid unnecessary layout/paint work
      if (renderer.viewport?.width !== logicalWidth || renderer.viewport?.height !== logicalHeight) {
        renderer.resize(logicalWidth, logicalHeight);
      }
    } else {
      // Fallback sizing when MVC/renderer is not yet initialized
      if (canvas.style.width !== `${logicalWidth}px`) canvas.style.width = `${logicalWidth}px`;
      if (canvas.style.height !== `${logicalHeight}px`) canvas.style.height = `${logicalHeight}px`;

      const nextW = Math.max(1, Math.floor(logicalWidth * dpr));
      const nextH = Math.max(1, Math.floor(logicalHeight * dpr));
      if (canvas.width !== nextW) canvas.width = nextW;
      if (canvas.height !== nextH) canvas.height = nextH;

      const ctx = canvas.getContext('2d');
      if (ctx?.setTransform) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (ctx?.scale) {
        ctx.scale(dpr, dpr);
      }
    }

    // Redraw after resize (only if size actually changed)
    const last = lastLogicalSizeRef.current || {};
    if (last.width !== logicalWidth || last.height !== logicalHeight) {
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
        try { console.error && console.error('drawWithOverlay failed after resize', err); } catch (e) {
          // Intentionally ignored
        }
      }
    }
  }, [drawWithOverlay, canvasRef, gameRef]);

  // Helper to convert mouse event to cell coordinates
  const eventToCell = useCallback((e) => {
    const canvas = canvasRef.current;
    const offset = offsetRef?.current;
    if (!canvas) {
      if (logger) logger.warn('[useCanvasManager] eventToCell: canvasRef.current is null');
      return null;
    }
    if (!offset) {
      if (logger) logger.warn('[useCanvasManager] eventToCell: offsetRef.current is null');
      return null;
    }
    if (!cellSize) {
      if (logger) logger.warn('[useCanvasManager] eventToCell: cellSize is falsy', cellSize);
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    // Ignore hover events outside the canvas unless a button is pressed (dragging).
    if (!inside && !e.buttons) return null;
    // Use only local variables in eventToCellFromCanvas
    const pt = eventToCellFromCanvas(e, canvas, offsetRef, cellSize);
    if (!pt) {
      if (logger) logger.warn('[useCanvasManager] eventToCell: eventToCellFromCanvas returned null', {
        e,
        canvas,
        offset,
        cellSize
      });
    }
    return pt;
  }, [offsetRef, cellSize, canvasRef, logger]);

  // Canvas click: toggle or place shape
  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !offsetRef?.current) return;
    const rect = canvas.getBoundingClientRect();
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
    const nextX = panOffsetStartRef.current.x - dxCells;
    const nextY = panOffsetStartRef.current.y - dyCells;
    offsetRef.current.x = nextX;
    offsetRef.current.y = nextY;
    try {
      // Keep the MVC viewport in sync so rendering and hit-testing agree after pans.
      gameRef?.current?.model?.setOffsetModel?.(nextX, nextY);
    } catch (err) {
      console.error('updatePanning setOffsetModel failed', err);
    }
    drawWithOverlay();
    if (e.preventDefault) e.preventDefault();
  }, [cellSize, drawWithOverlay, offsetRef, gameRef]);

  // Tool mouse handling - canvas manager only updates cursor and delegates to runtime hook
  const handleToolMouseDown = useCallback((e) => {
    const tool = toolMap[selectedTool];
    if (!tool) return;
    const pt = eventToCell(e);
    if (!pt) return;
    scheduleCursorUpdate(pt);

    // Canvas manager only handles cursor state - tool interaction is handled by runtime hook
    setToolState({
      ...toolStateRef.current,
      last: { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy }
    });
    // Delegate to controller so tool logic executes
    try {
      getController()?.handleMouseDown?.(pt);
    } catch (err) {
      console.error('handleToolMouseDown controller error', err);
    }
    
    drawWithOverlay();
   
  }, [toolMap, selectedTool, eventToCell, scheduleCursorUpdate, drawWithOverlay, toolStateRef, setToolState, getController]);

  const handleShapeToolMove = useCallback((e, tool, pt) => {
    if (!pt) return;
    setToolState({
      ...toolStateRef.current,
      last: { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy }
    });
    
    // Canvas manager only updates cursor state - tool interaction handled by runtime hook
    scheduleOverlayDraw();
    
  }, [scheduleOverlayDraw, toolStateRef, setToolState]);

  const shouldToolMove = useCallback((e) => {
    return (e.buttons & 1) || toolStateRef.current.last || toolStateRef.current.start;
    
  }, [toolStateRef]);

  // Mouse event handlers
  // Track if a drag is in progress for global mouseup
  const dragActiveRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    dragActiveRef.current = true;
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
      setToolState({
        ...toolStateRef.current,
        last: { x: pt.x, y: pt.y, fx: pt.fx, fy: pt.fy }
      });
      scheduleOverlayDraw();
    }
    // Controller handles actual tool interactions
    if (pt) {
      try { getController()?.handleMouseMove?.(pt); } catch (err) { console.error('handleMouseMove controller error', err); }
    }
    
  }, [eventToCell, scheduleCursorUpdate, toolMap, selectedTool, shouldToolMove, handleShapeToolMove, scheduleOverlayDraw, updatePanning, toolStateRef, setToolState, getController]);

  const handleMouseUp = useCallback((e) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* releasePointerCapture not supported */ }
      return;
    }

    // Canvas manager only handles rendering - tool interaction is delegated to runtime hook
    // which properly uses controller.handleToolMouseUp() for undo/diff recording
    try {
      const pt = eventToCell(e);
      getController()?.handleMouseUp?.(pt || undefined);
    } catch (err) {
      console.error('handleMouseUp controller error', err);
    }
    drawWithOverlay();
  }, [drawWithOverlay, eventToCell, getController]);
  // Attach global mouseup handler during drag
  useEffect(() => {
    return () => {
      if (pendingOverlayFrame.current != null) {
        cancelAnimationFrame(pendingOverlayFrame.current);
        pendingOverlayFrame.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function globalMouseUp(e) {
      if (dragActiveRef.current) {
        handleMouseUp(e);
      }
    }
    globalThis.addEventListener('mouseup', globalMouseUp);
    globalThis.addEventListener('touchend', globalMouseUp);
    return () => {
      globalThis.removeEventListener('mouseup', globalMouseUp);
      globalThis.removeEventListener('touchend', globalMouseUp);
    };
  }, [handleMouseUp]);

  useEffect(() => {
    if (!ready) return;
    // initial size and subscribe
    resizeCanvas();
    // Debounce window resize to avoid layout thrash from rapid sequential events
    let resizeTimer = null;
    const debouncedWindowResize = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        resizeCanvas();
      }, 80);
    };
    globalThis.globalThis.addEventListener('resize', debouncedWindowResize);

    // Setup ResizeObserver on the canvas container to automatically resize when
    // layout changes (e.g., header hide/show). If ResizeObserver is unavailable
    // fall back to globalThis resize events only.
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
                } catch (e) {
                  // Intentionally ignored
                }
            // Use requestAnimationFrame to ensure layout has stabilized in the
            // browser before reading bounding rects. Some browsers (Chrome)
            // may schedule RO callbacks before final layout is committed.
            const schedule = typeof globalThis.requestAnimationFrame === 'function'
              ? globalThis.requestAnimationFrame.bind(globalThis)
              : (fn) => setTimeout(fn, 0);
            schedule(() => {
              const entry = entries && entries[0];
              let width = 0; let height = 0;
              if (entry && entry.contentRect) {
                width = entry.contentRect.width || 0;
                height = entry.contentRect.height || 0;
              }
              // If contentRect isn't available (some RO implementations), prefer
              // to read the observed element's boundingClientRect which reflects the
              // visual size we care about. Fall back to the canvas element itself.
              const observedElement = entry?.target || canvasRef.current?.parentElement || canvasRef.current;
              if ((!width || !height) && observedElement && observedElement.getBoundingClientRect) {
                const b = observedElement.getBoundingClientRect();
                width = b.width || width;
                height = b.height || height;
              }
              if (width && height) {
                observedSizeRef.current = { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
                // Skip work if size didn't change to avoid repeated layout/reflow.
                const last = lastLogicalSizeRef.current || {};
                if (last.width !== observedSizeRef.current.width || last.height !== observedSizeRef.current.height) {
                  if (globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS) pushDebug && pushDebug('[useCanvasManager] ResizeObserver observed size ' + JSON.stringify(observedSizeRef.current));
                  const canvasEl = canvasRef.current;
                  if (canvasEl) {
                    canvasEl.style.width = `${observedSizeRef.current.width}px`;
                    canvasEl.style.height = `${observedSizeRef.current.height}px`;
                  }
                  resizeCanvas();
                }
              } else {
                try {
                  const DBG = Boolean(globalThis.__GOL_DEBUG_CANVAS__ || globalThis.GOL_DEBUG_CANVAS);
                  if (DBG) {
                    const canvas = canvasRef.current;
                    console.warn && console.warn('[useCanvasManager] ResizeObserver produced empty rect, canvas rect:', canvas && canvas.getBoundingClientRect());
                    pushDebug && pushDebug('[useCanvasManager] ResizeObserver produced empty rect');
                  }
                } catch (e) {
                  // Intentionally ignored
                }
              }
            });
          } catch (err) {
            // swallow observer errors to avoid breaking the app
          }
        });
        const canvas = canvasRef.current || null;
        const target = canvas?.parentElement || canvas;
        if (target) ro.observe(target);
      }
    } catch (err) {
      // ignore
    }

    return () => {
      globalThis.globalThis.removeEventListener('resize', debouncedWindowResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
      try { if (ro) ro.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [ready, resizeCanvas, canvasRef]);

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