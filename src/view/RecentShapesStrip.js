import React, { useEffect, useCallback, useRef, useState, useMemo, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import ShapeSlot from './components/ShapeSlot';
import useInputType from './hooks/useInputType';

const thumbnailSize = 64;

const formatSavedStatus = (timestamp) => {
  if (!timestamp) return '';
  try {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return '';
    const diff = Date.now() - ts;
    if (diff < 15000) return 'Saved just now';
    if (diff < 60000) return 'Saved < 1m ago';
    if (diff < 3600000) {
      const mins = Math.round(diff / 60000);
      return `Saved ${mins}m ago`;
    }
    const date = new Date(ts);
    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return 'Saved';
  }
};

const RecentShapesStrip = ({
  recentShapes = [],
  selectShape,
  drawWithOverlay,
  colorScheme = {},
  selectedShape = null,
  onRotateShape,
  onSwitchToShapesTool,
  startPaletteDrag,
  onSaveRecentShapes,
  onClearRecentShapes,
  persistenceStatus = {}
}) => {
  const {
    lastSavedAt = null,
    loadedFromStorage = false,
    hasSavedState = false,
    isDirty = false,
    error: persistenceError = null
  } = persistenceStatus || {};
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const getShapeTitle = (shape, index) => {
    return shape?.name || shape?.meta?.name || shape?.id || `shape ${index}`;
  };

  const isShapeSelected = (shape) => {
    if (!selectedShape || !shape) return false;
    if (shape.id && selectedShape.id) return shape.id === selectedShape.id;
    if (shape.name && selectedShape.name) return shape.name === selectedShape.name;
    try {
      return JSON.stringify(shape) === JSON.stringify(selectedShape);
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('Failed to compare shapes for selection check:', e);
      return false;
    }
  };

  const handleShapeClick = (shape) => {
    // Always switch to shapes tool first
    if (typeof onSwitchToShapesTool === 'function') onSwitchToShapesTool();
    // Always set the selected shape for the tool, even if already selected
    if (typeof selectShape === 'function') {
      // Force update by passing a new object reference if already selected
      if (selectedShape && shape && (shape.id === selectedShape.id || shape.name === selectedShape.name)) {
        selectShape({ ...shape });
      } else {
        selectShape(shape);
      }
    }
    // Optionally trigger overlay redraw if needed
    if (typeof drawWithOverlay === 'function') drawWithOverlay();
  };


  // Render all recent shapes in the order provided, never reordering.
  const slots = useMemo(() => Array.isArray(recentShapes) ? [...recentShapes] : [], [recentShapes]);

  // Log the order of shapes every render
  // Persist zoom factor across clears
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    // Compute zoom factor for drag ghost scaling
    const thumbnailSize = 64;
    const cellSize = colorScheme?.cellSize;
    const maxShapeDim = Math.max(...slots.map(s => Math.max(s?.width || s?.meta?.width || 1, s?.height || s?.meta?.height || 1)), 1);
    const newZoom = (cellSize * maxShapeDim) / thumbnailSize || 1;
    // Only update zoom if there are shapes
    if (slots.length > 0) {
      setZoom(newZoom);
    }
    // If cleared, keep previous zoom
  }, [slots, colorScheme]);

  // Detect current input device (mouse, touch, pen) so child components
  // can adjust interactions for touch vs mouse if needed.
  const inputType = useInputType();

  const bg = (colorScheme && (colorScheme.panelBackground || colorScheme.background)) || '#111217';
  const panelBorder = '1px solid rgba(255,255,255,0.04)';

  const statusText = (() => {
    if (persistenceError) return 'Save failed';
    if (isSaving) return 'Saving…';
    if (isDirty) return 'Changes not saved';
    if (lastSavedAt) return formatSavedStatus(lastSavedAt);
    if (hasSavedState) return 'Saved to disk';
    if (loadedFromStorage) return 'Loaded from disk';
    if (!slots.length) return 'No recent shapes yet';
    return 'Not saved yet';
  })();

  const handleSaveClick = useCallback(() => {
    if (typeof onSaveRecentShapes !== 'function') return;
    try {
      const result = onSaveRecentShapes();
      if (result && typeof result.then === 'function') {
        setIsSaving(true);
        Promise.resolve(result)
          .catch(() => {})
          .finally(() => setIsSaving(false));
      }
    } catch (e) {
      setIsSaving(false);
    }
  }, [onSaveRecentShapes]);

  const handleClearClick = useCallback(() => {
    if (typeof onClearRecentShapes !== 'function') return;
    try {
      const prevZoom = zoom;
      const result = onClearRecentShapes();
      if (result && typeof result.then === 'function') {
        setIsClearing(true);
        Promise.resolve(result)
          .catch(() => {})
          .finally(() => {
            setIsClearing(false);
            setZoom(prevZoom); // Restore zoom after clear
          });
      } else {
        setZoom(prevZoom);
      }
    } catch (e) {
      setIsClearing(false);
    }
  }, [onClearRecentShapes, zoom]);

  /* Diagnostic helpers (inside component so hooks are valid) */
  const svgToImageData = useCallback((svgEl) => {
    try {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const b64Start = 'data:image/svg+xml;base64,';
      const img = new Image();
      img.src = b64Start + svg64;
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || svgEl.clientWidth || 64;
            canvas.height = img.height || svgEl.clientHeight || 64;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve({ data, width: canvas.width, height: canvas.height });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (e) => reject(e);
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }, []);

  const compareSVGsAndLog = useCallback((shapeId) => {
    try {
      const pal = document.querySelector(`svg[data-shape-id="${shapeId}"][data-preview-source="palette"]`);
      const rec = document.querySelector(`svg[data-shape-id="${shapeId}"][data-preview-source="recent"]`);
      if (!pal || !rec) return;
      Promise.all([svgToImageData(pal), svgToImageData(rec)])
        .then(([a, b]) => {
          const ax = Math.floor(a.width / 2); const ay = Math.floor(a.height / 2);
          const bx = Math.floor(b.width / 2); const by = Math.floor(b.height / 2);
          const aidx = (ay * a.width + ax) * 4;
          const bidx = (by * b.width + bx) * 4;
          const acol = `rgba(${a.data.data[aidx]},${a.data.data[aidx+1]},${a.data.data[aidx+2]},${a.data.data[aidx+3] / 255})`;
          const bcol = `rgba(${b.data.data[bidx]},${b.data.data[bidx+1]},${b.data.data[bidx+2]},${b.data.data[bidx+3] / 255})`;
          if (acol !== bcol) {
            console.warn('[RecentShapesStrip] Pixel mismatch for', shapeId, { palette: acol, recent: bcol });
          } else {
            console.debug('[RecentShapesStrip] Pixel match for', shapeId, { color: acol });
          }
        })
        .catch((err) => console.error('SVG compare error', err));
    } catch (err) {
      console.error('compareSVGsAndLog error', err);
    }
  }, [svgToImageData]);

  // Delay compare until DOM paints
  useEffect(() => {
    // The SVG compare is a diagnostic-only task that can be moderately
    // expensive (image decoding, canvas drawImage, getImageData). Disable
    // it by default and only enable when the developer explicitly turns on
    // the global flag `__GOL_RECENT_COMPARE_ENABLED__` to avoid introducing
    // UI jank when recent shapes update (for example after clicking Add).
    if (!(typeof globalThis !== 'undefined' && globalThis.__GOL_RECENT_COMPARE_ENABLED__)) return undefined;
    const firstShape = recentShapes.find(s => !!s);
    if (!firstShape) return undefined;
    const id = firstShape.id || firstShape.name;
    if (!id) return undefined;
    // Defer SVG compare to idle time to avoid blocking paint
    const runCompare = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => compareSVGsAndLog(id), { timeout: 1000 });
      } else {
        setTimeout(() => compareSVGsAndLog(id), 500);
      }
    };
    runCompare();
    return () => {};
  }, [recentShapes, compareSVGsAndLog]);

  // --- Netflix-style strip behavior ---
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const holdIntervalRef = useRef(null);
  // Drag-to-scroll state for touch / pointer devices
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const momentumFrameRef = useRef(null);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, [setCanScrollLeft, setCanScrollRight]);

  useLayoutEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, slots]);

  const scrollByAmount = useCallback((delta) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const pageScroll = useCallback((direction = 1) => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by approximately 3-4 shape slots (130px + 12px gap = 142px per slot)
    const slotWidth = 142;
    const slotsToScroll = 3;
    const amount = slotWidth * slotsToScroll * direction;
    scrollByAmount(amount);
  }, [scrollByAmount]);

  const startHoldScroll = useCallback((direction = 1) => {
    if (holdIntervalRef.current) return;
    // small incremental scroll for smooth continuous movement
    holdIntervalRef.current = setInterval(() => {
      scrollByAmount(direction * 24);
    }, 50);
  }, [scrollByAmount]);

  const stopHoldScroll = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // Pointer / touch handlers for swipe-to-scroll with light momentum
  const cancelMomentum = useCallback(() => {
    if (momentumFrameRef.current) {
      cancelAnimationFrame(momentumFrameRef.current);
      momentumFrameRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    // If the pointerdown originated from inside a shape slot, don't take
    // pointer capture here so the child `ShapeSlot` can capture and start
    // a drag/placement interaction instead of the scroll-to-pan behavior.
    try {
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-shape-slot]')) return;
    } catch (err) {}
    cancelMomentum();
    try { el.setPointerCapture?.(e.pointerId); } catch (err) {}
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startScrollRef.current = el.scrollLeft;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  }, [cancelMomentum]);

  const onPointerMove = useCallback((e) => {
    const el = scrollRef.current;
    if (!el || !isDraggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dx = e.clientX - lastXRef.current;
    // velocity in px per ms
    velocityRef.current = dx / dt;
    const move = e.clientX - startXRef.current;
    el.scrollLeft = Math.max(0, startScrollRef.current - move);
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;
  }, []);

  const startMomentum = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    let v = velocityRef.current || 0; // px per ms
    // amplify slightly so quick swipes feel responsive
    v *= 1.6;
    const step = () => {
      if (!el) return;
      // apply friction
      v *= 0.94;
      if (Math.abs(v) < 0.02) {
        momentumFrameRef.current = null;
        return;
      }
      // approximate frame time
      el.scrollLeft = Math.max(0, el.scrollLeft - v * 16);
      momentumFrameRef.current = requestAnimationFrame(step);
    };
    momentumFrameRef.current = requestAnimationFrame(step);
  }, []);

  const finishPointer = useCallback((e) => {
    const el = scrollRef.current;
    if (el) {
      try { el.releasePointerCapture?.(e.pointerId); } catch (err) {}
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    // kick off momentum if velocity is present
    if (Math.abs(velocityRef.current) > 0.02) startMomentum();
  }, [startMomentum]);

  return (
    <div
      aria-label="Recent shapes"
      style={{
        position: 'relative',
        left: 0,
        width: '100%',
        zIndex: 41,
        pointerEvents: 'auto',
        opacity: 1,
        background: `linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.45) 100%)`,
        borderRadius: 8,
        border: panelBorder,
        padding: '12px 10px',
        maxWidth: '100%',
        overflow: 'visible',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}
    >
      {typeof onSaveRecentShapes === 'function' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 6,
            minWidth: 180,
            maxWidth: 240,
            paddingRight: 12
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.6, color: '#f3f6f5' }}>Recent shapes</span>
          <div style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!slots.length || isSaving || (!isDirty && hasSavedState)}
              data-testid="recent-save-button"
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#031b16',
                background: (!slots.length || (!isDirty && hasSavedState))
                  ? 'rgba(255,255,255,0.25)'
                  : 'linear-gradient(135deg, #00f5a0, #00d9f5)',
                cursor: (!slots.length || (!isDirty && hasSavedState)) ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.8 : 1,
                transition: 'opacity 120ms ease',
                flex: '0 0 auto'
              }}
            >
              {isSaving ? 'Saving…' : isDirty ? 'Save recent shapes' : 'Saved'}
            </button>
            {typeof onClearRecentShapes === 'function' && (
              <button
                type="button"
                onClick={handleClearClick}
                disabled={!slots.length || isClearing}
                data-testid="recent-clear-button"
                style={{
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#f3f6f5',
                  background: 'transparent',
                  cursor: (!slots.length || isClearing) ? 'not-allowed' : 'pointer',
                  opacity: isClearing ? 0.7 : 1,
                  transition: 'opacity 120ms ease',
                  flex: '0 0 auto'
                }}
              >
                {isClearing ? 'Clearing…' : 'Clear'}
              </button>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>{statusText}</span>
        </div>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Left nav button */}
        <button
          aria-hidden={!canScrollLeft}
          onClick={() => pageScroll(-1)}
          onMouseDown={() => startHoldScroll(-1)}
          onMouseUp={stopHoldScroll}
          onMouseLeave={stopHoldScroll}
          style={{
            position: 'absolute',
            left: 2,
            top: 6,
            zIndex: 50,
            border: 'none',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.35), transparent)',
            color: '#fff',
            height: 64,
            width: 36,
            display: canScrollLeft ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            cursor: 'pointer'
          }}
          data-testid="recent-left-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <div
          ref={scrollRef}
          className="recent-shapes-scroll"
          onWheel={(e) => {
            // Translate vertical wheel into horizontal scroll for a "carousel" feel
            const el = scrollRef.current;
            if (!el) return;
            // Only intercept primarily-vertical scrolls so nested vertical scrolling still works
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault();
              el.scrollBy({ left: e.deltaY, behavior: 'auto' });
              return;
            }
            // allow default horizontal wheel behavior otherwise
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onPointerLeave={finishPointer}
          style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            gap: 12,
            width: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            cursor: isDragging ? 'grabbing' : 'grab',
            // Balanced vertical padding so slots appear visually centered
            paddingBottom: 8,
            paddingTop: 8,
            scrollSnapType: 'x mandatory',
            paddingLeft: 4,
            paddingRight: 6,
            // Reserve scrollbar gutter space where supported so the scrollbar
            // doesn't overlay the content and hide labels on desktop.
            scrollbarGutter: 'stable',
            scrollBehavior: 'smooth'
          }}
        >
        {slots.map((shape, index) => {
          let slotKey;
          if (shape) {
            const baseKey = shape.id || shape.name || 'shape';
            slotKey = `${baseKey}-${index}`;
          } else {
            slotKey = `empty-slot-${index}`;
          }
          const selected = isShapeSelected(shape);
          // Simplified: no scaling, shadow, or scrollIntoView
          const slotStyle = {
            width: 124,
            height: 96,
            minWidth: 124,
            maxWidth: 124,
            flexShrink: 0,
            scrollSnapAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            margin: '0 2px'
          };
          return (
            <div
              key={slotKey}
              style={slotStyle}
              onClick={() => handleShapeClick(shape)}
              tabIndex={0}
              role="button"
              aria-label={`Select shape ${getShapeTitle(shape, index)}`}
              data-shape-slot={true}
            >
              <ShapeSlot
                shape={shape}
                index={index}
                colorScheme={colorScheme}
                selected={selected}
                title={getShapeTitle(shape, index)}
                onSelect={() => handleShapeClick(shape)}
                onSwitchToShapesTool={onSwitchToShapesTool}
                onStartPaletteDrag={startPaletteDrag}
                onRotate={(rotatedShape) => {
                  if (typeof onRotateShape === 'function') onRotateShape(rotatedShape, index, { inPlace: true });
                }}
                thumbnailSize={thumbnailSize}
                zoom={zoom}
              />
            </div>
          );
        })}
        </div>
        {/* Right nav button */}
        <button
          aria-hidden={!canScrollRight}
          onClick={() => pageScroll(1)}
          onMouseDown={() => startHoldScroll(1)}
          onMouseUp={stopHoldScroll}
          onMouseLeave={stopHoldScroll}
          style={{
            position: 'absolute',
            right: 2,
            top: 6,
            zIndex: 50,
            border: 'none',
            background: 'linear-gradient(270deg, rgba(0,0,0,0.35), transparent)',
            color: '#fff',
            height: 64,
            width: 36,
            display: canScrollRight ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            cursor: 'pointer'
          }}
          data-testid="recent-right-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
      <style>{`
        .recent-shapes-scroll::-webkit-scrollbar { height: 8px; }
        .recent-shapes-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 8px; }
        .recent-shapes-scroll > div:focus-within { outline: 2px solid rgba(255,255,255,0.06); border-radius: 6px; }
        .recent-shapes-scroll > div:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  );
};

RecentShapesStrip.propTypes = {
  recentShapes: PropTypes.array,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  startPaletteDrag: PropTypes.func,
  onSaveRecentShapes: PropTypes.func,
  onClearRecentShapes: PropTypes.func,
  persistenceStatus: PropTypes.shape({
    lastSavedAt: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.instanceOf(Date)]),
    loadedFromStorage: PropTypes.bool,
    hasSavedState: PropTypes.bool,
    isDirty: PropTypes.bool,
    error: PropTypes.string
  })
};

export default RecentShapesStrip;