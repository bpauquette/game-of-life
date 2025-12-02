import React, { useMemo, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import {
  Refresh as ResetIcon
} from '@mui/icons-material';
import { transformShape } from '../../model/shapeTransforms';
import { rotateShape } from '../../model/shapeTransforms';

// Function to parse text and convert URLs to clickable links
function renderTextWithLinks(text, sx) {
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <Link
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            ...sx,
            color: '#00e6ff', // Match the cyan color used elsewhere
            textDecoration: 'underline',
            '&:hover': {
              color: '#00ffff',
            }
          }}
        >
          {part}
        </Link>
      );
    }
    return (
      <Typography
        key={index}
        component="span"
        sx={sx}
      >
        {part}
      </Typography>
    );
  });
}

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
// const PREVIEW_CACHE = new Map();
// const PREVIEW_CACHE_LIMIT = 200;

// function cacheGet(id) {
//   if (!id) return null;
//   const v = PREVIEW_CACHE.get(id);
//   if (!v) return null;
//   // mark as recently used
//   PREVIEW_CACHE.delete(id);
//   PREVIEW_CACHE.set(id, v);
//   return v;
// }

// function cacheSet(id, dataUrl) {
//   if (!id || !dataUrl) return;
//   PREVIEW_CACHE.set(id, dataUrl);
//   if (PREVIEW_CACHE.size > PREVIEW_CACHE_LIMIT) {
//     const firstKey = PREVIEW_CACHE.keys().next().value;
//     PREVIEW_CACHE.delete(firstKey);
//   }
// }

function PreviewPanel(props) {
  const { preview, maxSvgSize = 200, colorScheme, colorSchemeKey, onAddRecent } = props;
  const canvasRef = useRef(null);
  
  const [cachedDataUrl, setCachedDataUrl] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [transformIndex, setTransformIndex] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const transforms = ['identity', 'flipH', 'flipV', 'diag1', 'diag2'];
  const currentTransform = transforms[transformIndex];
  // Reset transform when preview changes
  useEffect(() => {
    setTransformIndex(0);
    setRotationAngle(0);
  }, [preview]);
  const cells = useMemo(() => {
    let c = (preview && Array.isArray(preview.cells) ? preview.cells : []);
    if (transformIndex !== 0) {
      c = transformShape(c, currentTransform);
    }
    if (rotationAngle !== 0) {
      // Convert visual clockwise rotation to math rotation
      // Visual 90° CW = Math 270°, Visual 180° = Math 180°, Visual 270° CW = Math 90°
      const mathAngle = rotationAngle === 90 ? 270 : rotationAngle === 270 ? 90 : rotationAngle;
      c = rotateShape(c, mathAngle);
    }
    return c;
  }, [preview, transformIndex, currentTransform, rotationAngle]);
  const bounds = useMemo(() => computeBounds(cells), [cells]);
  const { width, height } = bounds;
  // Use provided cellSize prop or fallback to 1
  const cellSize = typeof props.cellSize === 'number' ? props.cellSize : 1;
  const drawW = Math.min(maxSvgSize, width * cellSize + 8);
  const drawH = Math.min(maxSvgSize, height * cellSize + 8);
  const PREVIEW_BORDER_STYLE = { border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4 };

  // If too many cells, render into a canvas for speed and/or generate cached dataUrl
  useEffect(() => {
    setCachedDataUrl(null);
    setImgError(false);
    if (!preview) return;
    // Use static public thumbnail path
    const scheme = colorSchemeKey || 'default';
    const size = 128;
    const nameSlug = preview.name ? (String(preview.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,200)) : '';
    const thumbnailUrl = nameSlug ? `/thumbnails/${size}/${scheme}/${nameSlug}.png` : null;
    if (thumbnailUrl) {
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
    if (!canvasRef.current || !preview || (cachedDataUrl && !imgError)) return;
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
    <Box sx={{ minWidth: 260, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} data-testid="hover-preview-panel">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        {cachedDataUrl && !imgError ? (
          <img src={cachedDataUrl} alt={preview.name || 'shape preview'} style={{ width: drawW, height: drawH, objectFit: 'contain', ...PREVIEW_BORDER_STYLE }}
            onError={() => setImgError(true)}
          />
        ) : (
          <canvas ref={canvasRef} width={drawW} height={drawH} style={{ width: drawW, height: drawH, ...PREVIEW_BORDER_STYLE }} />
        )}
        <Box sx={{ maxWidth: 320, maxHeight: 200, overflow: 'hidden', textAlign: 'center' }}>
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
            <Box
              sx={{
                fontSize: 13,
                color: '#ffffff',
                fontWeight: 500,
                mt: 0.5,
                lineHeight: 1.4
              }}
            >
              {renderTextWithLinks(preview.description, {
                fontSize: 13,
                color: '#ffffff',
                fontWeight: 500,
                lineHeight: 1.4
              })}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Flip Horizontal */}
        <Tooltip title="Flip Horizontal" arrow>
          <IconButton
            size="small"
            onClick={() => setTransformIndex(1)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              {/* Two shapes with horizontal arrows showing left-right mirroring */}
              <rect x="3" y="8" width="6" height="8" fill="currentColor" opacity="0.6"/>
              <rect x="15" y="8" width="6" height="8" fill="currentColor" opacity="0.6"/>
              <path d="M10 10l2 2-2 2M14 10l-2 2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" opacity="0.5"/>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Flip Vertical */}
        <Tooltip title="Flip Vertical" arrow>
          <IconButton
            size="small"
            onClick={() => setTransformIndex(2)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              {/* Two shapes with vertical arrows showing up-down mirroring */}
              <rect x="8" y="3" width="8" height="6" fill="currentColor" opacity="0.6"/>
              <rect x="8" y="15" width="8" height="6" fill="currentColor" opacity="0.6"/>
              <path d="M10 10l2-2 2 2M10 14l2 2 2-2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" opacity="0.5"/>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Diagonal 1 (Main diagonal transpose) */}
        <Tooltip title="Transpose (Main Diagonal)" arrow>
          <IconButton
            size="small"
            onClick={() => setTransformIndex(3)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm16 16V5H5v14h14z"/>
              <path d="M6 6h12l-12 12V6z" opacity="0.3"/>
              <path d="M6 6l12 12M6 6h3M15 18v-3" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Diagonal 2 (Anti-diagonal transpose) */}
        <Tooltip title="Transpose (Anti-Diagonal)" arrow>
          <IconButton
            size="small"
            onClick={() => setTransformIndex(4)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm16 16V5H5v14h14z"/>
              <path d="M18 6L6 18h12V6z" opacity="0.3"/>
              <path d="M18 6L6 18M15 6h3M6 15v3" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Rotate 90° */}
        <Tooltip title="Rotate 90° Clockwise" arrow>
          <IconButton
            size="small"
            onClick={() => setRotationAngle(90)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1l4 4-4 4V6c-3.31 0-6 2.69-6 6 0 1.01.25 1.97.7 2.8L5.24 16.26C4.46 15.03 4 13.57 4 12c0-4.42 3.58-8 8-8z"/>
              <path d="M18.76 7.74C19.54 8.97 20 10.43 20 12c0 4.42-3.58 8-8 8v3l-4-4 4-4v3c3.31 0 6-2.69 6-6 0-1.01-.25-1.97-.7-2.8L18.76 7.74z"/>
              <text x="12" y="16" textAnchor="middle" fontSize="7" fill="currentColor">90°</text>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Rotate 180° */}
        <Tooltip title="Rotate 180°" arrow>
          <IconButton
            size="small"
            onClick={() => setRotationAngle(180)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6z"/>
              <path d="M18.76 7.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <text x="12" y="16" textAnchor="middle" fontSize="7" fill="currentColor">180°</text>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Rotate 270° */}
        <Tooltip title="Rotate 270° Clockwise" arrow>
          <IconButton
            size="small"
            onClick={() => setRotationAngle(270)}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1l4 4-4 4V6c-3.31 0-6 2.69-6 6 0 1.01.25 1.97.7 2.8L5.24 16.26C4.46 15.03 4 13.57 4 12c0-4.42 3.58-8 8-8z" transform="rotate(180 12 12)"/>
              <path d="M18.76 7.74C19.54 8.97 20 10.43 20 12c0 4.42-3.58 8-8 8v3l-4-4 4-4v3c3.31 0 6-2.69 6-6 0-1.01-.25-1.97-.7-2.8L18.76 7.74z" transform="rotate(180 12 12)"/>
              <text x="12" y="16" textAnchor="middle" fontSize="7" fill="currentColor">270°</text>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Reset */}
        <Tooltip title="Reset to Original" arrow>
          <IconButton
            size="small"
            onClick={() => { setTransformIndex(0); setRotationAngle(0); }}
            sx={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ResetIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Add to Recent */}
        <Tooltip title="Add Transformed to Recent" arrow>
          <IconButton
            size="small"
            onClick={() => {
              if (preview && cells.length > 0) {
                const transformedShape = {
                  ...preview,
                  cells,
                  name: `${preview.name || 'unnamed'} (${currentTransform}${rotationAngle ? ` rot${rotationAngle}` : ''})`.trim()
                };
                onAddRecent?.(transformedShape);
              }
            }}
            sx={{ 
              color: '#388e3c', 
              bgcolor: 'rgba(56,142,60,0.08)', 
              border: '1px solid rgba(56,142,60,0.3)',
              '&:hover': { bgcolor: 'rgba(56,142,60,0.15)' }
            }}
            data-testid="add-transformed-recent"
          >
            <svg width={18} height={18} viewBox="0 0 20 20">
              <circle cx={10} cy={10} r={9} fill="#388e3c" opacity={0.15} />
              <path d="M6 10h8M10 6v8" stroke="#388e3c" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

PreviewPanel.propTypes = {
  preview: PropTypes.object,
  maxSvgSize: PropTypes.number,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string,
  onAddRecent: PropTypes.func
};

export default PreviewPanel;
