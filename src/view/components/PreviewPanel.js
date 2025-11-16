/* eslint-disable sonarjs/cognitive-complexity */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function computeBounds(cells = []) {
  // Simple, low-complexity version: compute min/max with fewer branches
  if (!cells || cells.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
    const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  const width = (maxX - minX + 1) || 1;
  const height = (maxY - minY + 1) || 1;
  return { minX, minY, maxX, maxY, width, height };
}

// small LRU cache for generated preview images (data URLs)
const PREVIEW_CACHE = new Map();
const PREVIEW_CACHE_LIMIT = 200;

function cacheGet(id) {
  if (!id) return null;
  const v = PREVIEW_CACHE.get(id);
  if (!v) return null;
  // mark as recently used
  PREVIEW_CACHE.delete(id);
  PREVIEW_CACHE.set(id, v);
  return v;
}

function cacheSet(id, dataUrl) {
  if (!id || !dataUrl) return;
  PREVIEW_CACHE.set(id, dataUrl);
  if (PREVIEW_CACHE.size > PREVIEW_CACHE_LIMIT) {
    const firstKey = PREVIEW_CACHE.keys().next().value;
    PREVIEW_CACHE.delete(firstKey);
  }
}

export default function PreviewPanel({ preview, maxSvgSize = 200, colorScheme }) {
  const canvasRef = useRef(null);
  const MAX_CELLS = 800;
  const [cachedDataUrl, setCachedDataUrl] = useState(null);
  const cells = useMemo(() => (preview && Array.isArray(preview.cells) ? preview.cells : []), [preview]);
  const bounds = useMemo(() => computeBounds(cells), [cells]);
  const { minX, minY, width, height } = bounds;
  const cellSize = 8;
  const svgW = Math.min(maxSvgSize, width * cellSize + 8);
  const svgH = Math.min(maxSvgSize, height * cellSize + 8);
  const viewBox = `${minX} ${minY} ${width} ${height}`;
  const PREVIEW_BORDER_STYLE = { border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4 };

  // If too many cells, render into a canvas for speed and/or generate cached dataUrl
  useEffect(() => {
    setCachedDataUrl(null);
    if (!preview) return;
    if (!preview.id) return;
    const existing = cacheGet(preview.id);
    if (existing) {
      setCachedDataUrl(existing);
      return;
    }

    // small helper to create SVG data URL for small numbers of cells
    const createSvgDataUrl = () => {
      const svgParts = [];
      svgParts.push(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' width='${svgW}' height='${svgH}'>`);
      for (let i = 0; i < Math.min(cells.length, MAX_CELLS); i++) {
        const c = cells[i];
        const x = typeof c.x !== 'undefined' ? c.x : (Array.isArray(c) ? c[0] : 0);
        const y = typeof c.y !== 'undefined' ? c.y : (Array.isArray(c) ? c[1] : 0);
        const fill = (colorScheme && typeof colorScheme.getCellColor === 'function') ? colorScheme.getCellColor(x, y, 0) : '#1976d2';
        svgParts.push(`<rect x='${x}' y='${y}' width='1' height='1' fill='${fill}' />`);
      }
      svgParts.push('</svg>');
      const svgString = svgParts.join('');
      return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    };

    if (cells.length > MAX_CELLS) {
      // draw into temp canvas and cache dataURL
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.min(maxSvgSize, width * cellSize + 8);
        canvas.height = Math.min(maxSvgSize, height * cellSize + 8);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(0.5, 0.5);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const x = (typeof c.x !== 'undefined') ? c.x : (Array.isArray(c) ? c[0] : 0);
          const y = (typeof c.y !== 'undefined') ? c.y : (Array.isArray(c) ? c[1] : 0);
          const px = (x - minX) * cellSize;
          const py = (y - minY) * cellSize;
          const fill = (colorScheme && typeof colorScheme.getCellColor === 'function') ? colorScheme.getCellColor(x, y, 0) : '#1976d2';
          ctx.fillStyle = fill;
          ctx.fillRect(px, py, cellSize, cellSize);
        }
        ctx.restore();
        try {
          const dataUrl = canvas.toDataURL('image/png');
          cacheSet(preview.id, dataUrl);
          setCachedDataUrl(dataUrl);
        } catch (err) {
          // ignore toDataURL errors
        }
      }
    } else {
      try {
        const dataUrl = createSvgDataUrl();
        cacheSet(preview.id, dataUrl);
        setCachedDataUrl(dataUrl);
      } catch (err) {
        // ignore
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, cells.length, maxSvgSize, width, height, colorScheme]);

  if (!preview) return <Box sx={{ minWidth: 260, minHeight: 220 }} />;

  return (
    <Box sx={{ minWidth: 260, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-testid="hover-preview-panel">
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {cachedDataUrl ? (
          <img src={cachedDataUrl} alt={preview.name || 'shape preview'} style={{ width: svgW, height: svgH, objectFit: 'contain', ...PREVIEW_BORDER_STYLE }} />
        ) : (
          <> 
            {cells.length > 0 && cells.length <= MAX_CELLS && (
              <svg width={svgW} height={svgH} viewBox={viewBox} style={{ background: 'transparent', ...PREVIEW_BORDER_STYLE }}>
                <g>
                  {cells.map((c, i) => {
                    const x = typeof c.x !== 'undefined' ? c.x : (Array.isArray(c) ? c[0] : 0);
                    const y = typeof c.y !== 'undefined' ? c.y : (Array.isArray(c) ? c[1] : 0);
                    const fill = (colorScheme && typeof colorScheme.getCellColor === 'function') ? colorScheme.getCellColor(x, y, 0) : '#1976d2';
                    return <rect key={i} x={x} y={y} width="1" height="1" fill={fill} />;
                  })}
                </g>
              </svg>
            )}
            {cells.length > MAX_CELLS && (
              <canvas ref={canvasRef} style={{ ...PREVIEW_BORDER_STYLE }} />
            )}
          </>
        )}
        <Box sx={{ maxWidth: 320, maxHeight: 200, overflow: 'auto' }}>
          <Typography sx={{ fontWeight: 700 }}>{preview.name}</Typography>
          {preview.description && <Typography variant="body2" sx={{ fontSize: 12, color: 'rgba(0,0,0,0.7)' }}>{preview.description}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

PreviewPanel.propTypes = {
  preview: PropTypes.object,
  maxSvgSize: PropTypes.number,
  colorScheme: PropTypes.object
};
