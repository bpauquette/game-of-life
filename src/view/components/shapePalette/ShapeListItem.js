import React, { useRef, memo, useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ListItem from '@mui/material/ListItem';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { Delete as DeleteIcon, Public as PublicIcon, PublicOff as PublicOffIcon } from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import { updateShapePublic } from '../../../utils/backendApi';
import logger from '../../../controller/utils/logger';
import { fetchShapeById } from '../../../utils/backendApi';
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
  const hasShapeCells = (shape) => {
    if (!shape) return false;
    const has = (cells) => Array.isArray(cells) && cells.length > 0;
    return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
  };

  const [publicLoading, setPublicLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(!!shape.public);

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
    <ListItem
      key={`${keyBase}-${idx}`}
      disablePadding
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        px: 1,
        py: 0.5,
        minHeight: 32,
        justifyContent: 'center',
        '&:hover': {
          bgcolor: 'rgba(0,0,0,0.04)'
        }
      }}
    >
      {/* Public/Private Checkbox for user shapes */}
      {user && (
        <Tooltip title={isPublic ? 'Public (click to make private)' : 'Private (click to make public)'}>
          <span>
            <Checkbox
              icon={<PublicOffIcon fontSize="small" />}
              checkedIcon={<PublicIcon fontSize="small" />}
              checked={!!isPublic}
              disabled={publicLoading || (isPublic && shape.userId !== user.id)}
              onChange={async (e) => {
                e.stopPropagation();
                setPublicLoading(true);
                try {
                  const result = await updateShapePublic(shape.id, !isPublic);
                  setIsPublic(result.public);
                } catch (err) {
                  logger.warn('Failed to update public status:', err.message);
                } finally {
                  setPublicLoading(false);
                }
              }}
              size="small"
              sx={{ p: 0.5, mr: 1 }}
              inputProps={{ 'aria-label': isPublic ? 'Make private' : 'Make public' }}
            />
          </span>
        </Tooltip>
      )}
      {/* Plus Button - Fixed width left */}
      <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          aria-label="Add to Recent"
          size="small"
          sx={{
            width: 28,
            height: 28,
            color: '#388e3c',
            bgcolor: 'rgba(56,142,60,0.08)',
            '&:hover': {
              bgcolor: 'rgba(56,142,60,0.15)'
            }
          }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
          onClick={handleAddRecent}
          data-testid={`add-recent-btn-${keyBase}`}
        >
          <Tooltip title="Add to Recent Shapes" placement="top">
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span>
          </Tooltip>
        </IconButton>
      </Box>

      {/* Shape Icon - Fixed width center */}
      <Box sx={{
        width: 40,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 0.5
      }}>
        {cells.length > 0 && (
          <canvas
            ref={canvasRef}
            width={16}
            height={16}
            style={{ display: 'block' }}
          />
        )}
      </Box>

      {/* Shape Name - Constrained width centered */}
      <Box sx={{
        flex: '0 1 200px',
        minWidth: 120,
        maxWidth: 250,
        display: 'flex',
        justifyContent: 'center',
        px: 0.5
      }}>
        <ListItemButton
          onClick={() => onSelect(shape)}
          sx={{
            py: 0,
            px: 1,
            borderRadius: 1,
            minHeight: 28,
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: '#1976d2',
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              maxWidth: '100%'
            }}
            data-testid="shape-label"
          >
            {shape.name || '(unnamed)'}
          </Typography>
        </ListItemButton>
      </Box>

      {/* Delete Button - Fixed width right */}
      <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
        {user && shape.userId === user.id && (
          <IconButton
            aria-label="delete"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onRequestDelete(shape);
            }}
            sx={{
              width: 28,
              height: 28,
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main'
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
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
