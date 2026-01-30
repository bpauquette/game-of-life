import React, { useEffect, useCallback, useRef, useState, useMemo, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import ShapeSlot from './components/ShapeSlot.js';

const thumbnailSize = 64;

const RecentShapesStrip = ({
  recentShapes = [],
  selectShape,
  drawWithOverlay,
  colorScheme = {},
  selectedShape = null,
  onRotateShape,
  onSwitchToShapesTool,
  startPaletteDrag,
}) => {
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
  // Compute zoom as a derived value
  const zoom = useMemo(() => {
    const thumbnailSize = 64;
    const cellSize = colorScheme?.cellSize;
    const maxShapeDim = Math.max(...slots.map(s => Math.max(s?.width || s?.meta?.width || 1, s?.height || s?.meta?.height || 1)), 1);
    return slots.length > 0 ? (cellSize * maxShapeDim) / thumbnailSize || 1 : 1;
  }, [slots, colorScheme]);

  const bg = (colorScheme && (colorScheme.panelBackground || colorScheme.background)) || '#111217';
  const panelBorder = '1px solid rgba(255,255,255,0.04)';

  // Autosave recent shapes to localStorage whenever `slots` changes.
  useEffect(() => {
    try {
      localStorage.setItem('gol_recent_shapes', JSON.stringify(slots || []));
      const ts = Date.now();
      localStorage.setItem('gol_recent_shapes_ts', String(ts));
    } catch (e) {
      // ignore
    }
  }, [slots]);

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
      if ('requestIdleCallback' in globalThis) {
        globalThis.requestIdleCallback(() => compareSVGsAndLog(id), { timeout: 1000 });
      } else {
        setTimeout(() => compareSVGsAndLog(id), 500);
      }
    };
    runCompare();
    return () => {};
  }, [recentShapes, compareSVGsAndLog]);

  // --- Netflix-style strip behavior ---
  const scrollRef = useRef(null);
  // Compute scroll button state as derived values
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const canScrollLeft = scrollState.left;
  const canScrollRight = scrollState.right;
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
      setScrollState((prev) => (prev.left || prev.right ? { left: false, right: false } : prev));
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const left = scrollLeft > 2;
    const right = scrollLeft + clientWidth < scrollWidth - 2;
    setScrollState((prev) => (prev.left !== left || prev.right !== right ? { left, right } : prev));
  }, []);

  useLayoutEffect(() => {
    Promise.resolve().then(updateScrollButtons);
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    globalThis.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', onScroll);
      globalThis.removeEventListener('resize', updateScrollButtons);
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
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-shape-slot]')) return;
    cancelMomentum();
    el.setPointerCapture?.(e.pointerId);
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
      el.releasePointerCapture?.(e.pointerId);
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    // kick off momentum if velocity is present
    if (Math.abs(velocityRef.current) > 0.02) startMomentum();
  }, [startMomentum]);

  return (
    <div
      role="region"
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
        boxSizing: 'border-box',
        maxWidth: '100%',
        overflow: 'visible',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}
    >
      
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
            paddingBottom: 12,
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
            width: 130,
            height: 110,
            minWidth: 130,
            maxWidth: 130,
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
        .recent-shapes-scroll::-webkit-scrollbar-track { background: transparent; }
        .recent-shapes-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 8px; }
        .recent-shapes-scroll { scrollbar-color: rgba(255,255,255,0.06) transparent; }
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
};

export default RecentShapesStrip;