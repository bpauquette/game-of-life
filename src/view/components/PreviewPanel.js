/* eslint-disable complexity */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { resolveBackendBase } from '../../utils/backendApi';
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

export default function PreviewPanel({ preview, maxSvgSize = 200, colorScheme, colorSchemeKey }) {
  const canvasRef = useRef(null);
  
  const [cachedDataUrl, setCachedDataUrl] = useState(null);
  const [imgError, setImgError] = useState(false);
  const cells = useMemo(() => (preview && Array.isArray(preview.cells) ? preview.cells : []), [preview]);
  const bounds = useMemo(() => computeBounds(cells), [cells]);
  const { width, height } = bounds;
  const cellSize = 8;
  const drawW = Math.min(maxSvgSize, width * cellSize + 8);
  const drawH = Math.min(maxSvgSize, height * cellSize + 8);
  const PREVIEW_BORDER_STYLE = { border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4 };

  // If too many cells, render into a canvas for speed and/or generate cached dataUrl
  useEffect(() => {
    setCachedDataUrl(null);
    setImgError(false);
    if (!preview) return;
    const nameSlug = preview.name ? (String(preview.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,200)) : '';
    const cacheId = preview.id ? `${preview.id}::${colorSchemeKey || 'default'}` : `${nameSlug || JSON.stringify(cells).slice(0,200)}::${colorSchemeKey || 'default'}`;
    const existing = cacheGet(cacheId);
    if (existing) {
      setCachedDataUrl(existing);
      return;
    }
    // Use static public thumbnail path
    const scheme = colorSchemeKey || 'default';
    const size = 128;
    const thumbnailUrl = nameSlug ? `/thumbnails/${size}/${scheme}/${nameSlug}.png` : null;
    if (thumbnailUrl) {
      cacheSet(cacheId, thumbnailUrl);
      setCachedDataUrl(thumbnailUrl);
    }
    // No name-based thumbnail available. Per policy this UI should not request
    // on-demand renders for unnamed captures — the capture tool requires a name
    // before saving, and thumbnails are generated on save. Leave the canvas
    // placeholder empty until a saved thumbnail exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, cells.length, maxSvgSize, width, height, colorScheme]);

  // Draw shape preview in canvas if needed
  useEffect(() => {
    if (!canvasRef.current || !preview || cachedDataUrl && !imgError) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawW, drawH);
    // Simple cell rendering
    const cellColor = colorScheme?.cellColor || '#1976d2';
    for (const cell of cells) {
      const x = (typeof cell.x !== 'undefined') ? cell.x : (Array.isArray(cell) ? cell[0] : 0);
      const y = (typeof cell.y !== 'undefined') ? cell.y : (Array.isArray(cell) ? cell[1] : 0);
      ctx.fillStyle = cellColor;
      ctx.fillRect((x - bounds.minX) * cellSize + 4, (y - bounds.minY) * cellSize + 4, cellSize, cellSize);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, drawW, drawH);
  }, [canvasRef, preview, cachedDataUrl, imgError, cells, bounds, drawW, drawH, cellSize, colorScheme]);

  if (!preview) return <Box sx={{ minWidth: 260, minHeight: 220 }} />;

  return (
    <Box sx={{ minWidth: 260, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-testid="hover-preview-panel">
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {cachedDataUrl && !imgError ? (
          <img src={cachedDataUrl} alt={preview.name || 'shape preview'} style={{ width: drawW, height: drawH, objectFit: 'contain', ...PREVIEW_BORDER_STYLE }}
            onError={() => setImgError(true)}
          />
        ) : (
          <canvas ref={canvasRef} width={drawW} height={drawH} style={{ width: drawW, height: drawH, ...PREVIEW_BORDER_STYLE }} />
        )}
        <Box sx={{ maxWidth: 320, maxHeight: 200, overflow: 'auto' }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: '#00e6ff', // Vibrant cyan
              textShadow: '0 2px 8px rgba(0,0,0,0.25), 0 0 2px #00e6ff',
              fontSize: 20,
              letterSpacing: 0.5,
              mb: 1
            }}
          >
            {preview.name}
          </Typography>
          {preview.description && (
            <Typography
              variant="body2"
              sx={{
                fontSize: 13,
                color: '#fff',
                background: 'linear-gradient(90deg, #00e6ff 0%, #3ad6ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 500,
                textShadow: '0 1px 4px rgba(0,0,0,0.18)',
                mt: 0.5
              }}
            >
              {preview.description}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

PreviewPanel.propTypes = {
  preview: PropTypes.object,
  maxSvgSize: PropTypes.number,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string
};
