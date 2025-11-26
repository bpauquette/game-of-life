import React, { useRef, memo, useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ListItem from '@mui/material/ListItem';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { Delete as DeleteIcon } from '@mui/icons-material';
import logger from '../../../controller/utils/logger';
import { fetchShapeById } from '../../../utils/backendApi';

const hasShapeCells = (shape) => {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
};

const ShapeListItem = memo(function ShapeListItem({
  shape,
  idx,
  colorScheme,
  onSelect,
  onRequestDelete,
  onAddRecent,
  onHover,
  user,
  backendBase,
}) {
  const tRef = useRef(Date.now());
  const canvasRef = useRef(null);
  const [fullShape, setFullShape] = useState(null);
  const getCellColor = useCallback((x, y) => colorScheme?.getCellColor?.(x, y, tRef.current) ?? '#4a9', [colorScheme]);
  const keyBase = shape.id || 'shape';
  const displayShape = fullShape || shape;
  const cells = useMemo(() => (displayShape?.cells || []), [displayShape]);

  // Fetch full shape if needed
  useEffect(() => {
    if (shape.id && !hasShapeCells(shape) && !fullShape && backendBase) {
      fetchShapeById(shape.id, backendBase).then(res => {
        if (res.ok && res.data) {
          setFullShape(res.data);
        }
      }).catch(err => {
        logger.warn('[ShapeListItem] failed to fetch shape:', shape.id, err);
      });
    }
  }, [shape.id, shape, fullShape, backendBase]);

  // Draw mini preview
  useEffect(() => {
    if (!canvasRef.current || !cells.length) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 16, 16);
    
    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const cell of cells) {
      const x = cell.x ?? cell[0];
      const y = cell.y ?? cell[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min(16 / width, 16 / height);
    
    ctx.save();
    ctx.scale(scale, scale);
    const cellSize = 1;
    for (const cell of cells) {
      const x = (cell.x ?? cell[0]) - minX;
      const y = (cell.y ?? cell[1]) - minY;
      const color = getCellColor(x + minX, y + minY);
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
    ctx.restore();
  }, [cells, getCellColor]);

  try {
    const first = Array.isArray(shape.cells) && shape.cells.length > 0 ? shape.cells[0] : null;
    if (first) {
      const fx = first.x ?? first[0];
      const fy = first.y ?? first[1];
      const sampleColor = getCellColor(fx, fy);
      if (globalThis.__GOL_PREVIEW_DEBUG__) {
        logger.debug('[ShapePaletteDialog] palette-sample', {
          id: shape.id || shape.name,
          x: fx,
          y: fy,
          color: sampleColor,
        });
      }
    }
  } catch (error) {
    logger.warn('[ShapePaletteDialog] preview sample failed:', error);
  }

  const handleAddRecent = (event) => {
    event.stopPropagation();
    setTimeout(() => onAddRecent(shape), 0);
  };

  const hoverId = shape?.id ?? null;
  return (
    <ListItem key={`${keyBase}-${idx}`} disablePadding sx={{ p: 0, minHeight: 20 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', p: 0 }}>
        <IconButton
          aria-label="Add to Recent"
          size="small"
          sx={{ mr: 0, width: 16, height: 16, p: 0, color: '#388e3c', bgcolor: 'rgba(56,142,60,0.08)', borderRadius: 1 }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
          onClick={handleAddRecent}
          data-testid={`add-recent-btn-${keyBase}`}
        >
          <Tooltip title="Add to Recent Shapes" placement="left">
            <span>
              <svg width={12} height={12} viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
                <circle cx={10} cy={10} r={9} fill="#388e3c" opacity={0.15} />
                <path d="M6 10h8M10 6v8" stroke="#388e3c" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </span>
          </Tooltip>
        </IconButton>
        {cells.length > 0 && (
          <canvas
            ref={canvasRef}
            width={16}
            height={16}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
        )}
        <ListItemButton
          onClick={() => onSelect(shape)}
          sx={{ flex: 1, p: 0 }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, color: '#1976d2', mb: 0, fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: 1 }}
              data-testid="shape-label"
            >
              {shape.name || '(unnamed)'}
            </Typography>
          </Box>
            {user && shape.userId === user.id && (
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestDelete(shape);
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
        </ListItemButton>
      </Box>
    </ListItem>
  );
});

ShapeListItem.propTypes = {
  shape: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  colorScheme: PropTypes.object,
  onSelect: PropTypes.func,
  onRequestDelete: PropTypes.func,
  onAddRecent: PropTypes.func.isRequired,
  onHover: PropTypes.func,
  user: PropTypes.object,
  backendBase: PropTypes.string,
};

export default ShapeListItem;
