import React, { useEffect, useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ShapeSlot from './components/ShapeSlot';

const RecentShapesStrip = ({
  recentShapes = [],
  selectShape,
  drawWithOverlay,
  colorScheme = {},
  selectedShape = null,
  onRotateShape,
  onSwitchToShapesTool
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
    // Switch to shapes tool first so tool state/overlays are prepared
    // to receive the selected shape (avoids race where selection is set
    // but the tool isn't active yet).
    if (typeof onSwitchToShapesTool === 'function') onSwitchToShapesTool();
    if (globalThis.gameController && typeof globalThis.gameController.setSelectedShape === 'function') {
      globalThis.gameController.setSelectedShape(shape);
    } else if (typeof selectShape === 'function') {
      selectShape(shape);
    }
    if (typeof drawWithOverlay === 'function') drawWithOverlay();
  };

  // Render all recent shapes without an artificial slot limit so new shapes
  // flow off to the right and can be scrolled into view. This allows the
  // strip to grow indefinitely and rely on overflow + nav controls.
  const slots = Array.isArray(recentShapes) ? recentShapes : [];

  const bg = (colorScheme && (colorScheme.panelBackground || colorScheme.background)) || '#111217';
  const panelBorder = '1px solid rgba(255,255,255,0.04)';
  const cardBg = colorScheme?.cardBackground || 'rgba(255,255,255,0.02)';
  const FLEX_START = 'flex-start';

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
    const firstShape = recentShapes.find(s => !!s);
    if (!firstShape) return;
    const id = firstShape.id || firstShape.name;
    if (!id) return;
    const t = setTimeout(() => compareSVGsAndLog(id), 250);
    return () => clearTimeout(t);
  }, [recentShapes, compareSVGsAndLog]);

  // --- Netflix-style strip behavior ---
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const holdIntervalRef = useRef(null);

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

  useEffect(() => {
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
  }, [updateScrollButtons]);

  const scrollByAmount = useCallback((delta) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const pageScroll = useCallback((direction = 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.75) * direction;
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
        padding: '10px 10px 14px 10px',
        maxWidth: '100%',
        overflow: 'visible',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: FLEX_START
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
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: FLEX_START,
            gap: 12,
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 12,
            paddingTop: 8,
            scrollSnapType: 'x mandatory',
            paddingLeft: 4,
            paddingRight: 6
          }}
        >
        {slots.map((shape, index) => {
          // Ensure keys are unique per rendered slot. Some shapes may share the same
          // `id` or `name` (for example when shapes are created from identical
          // sources), which caused React warnings like
          // "Encountered two children with the same key, `1-2-3`". Append the
          // slot index so keys are always unique while remaining stable enough for
          // reconciliation within this list.
          let slotKey;
          if (shape) {
            const baseKey = shape.id || shape.name || 'shape';
            slotKey = `${baseKey}-${index}`;
          } else {
            slotKey = `empty-slot-${index}`;
          }
          return (
            <div
              key={slotKey}
              style={{
                minWidth: 92,
                maxWidth: 140,
                flexShrink: 0,
                scrollSnapAlign: 'center',
                  display: 'flex',
                  alignItems: FLEX_START,
                justifyContent: 'center'
              }}
            >
                <div style={{ padding: 6, borderRadius: 8, background: cardBg, display: 'flex', alignItems: FLEX_START, gap: 8 }}>
                <ShapeSlot
                  shape={shape}
                  index={index}
                  colorScheme={colorScheme}
                  selected={isShapeSelected(shape)}
                  title={getShapeTitle(shape, index)}
                  onSelect={() => handleShapeClick(shape)}
                  onRotate={(rotatedShape, i) => {
                    if (typeof onRotateShape === 'function') onRotateShape(rotatedShape, i, { inPlace: true });
                  }}
                />
              </div>
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
  onSwitchToShapesTool: PropTypes.func
};

export default RecentShapesStrip;