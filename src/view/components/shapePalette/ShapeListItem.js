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
import { fetchShapeById, updateShapePublic } from '../../../utils/backendApi.js';
import logger from '../../../controller/utils/logger.js';

function hasShapeCells(shape) {
  if (!shape) return false;
  const has = (cells) => Array.isArray(cells) && cells.length > 0;
  return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
}

function resolveCellPoint(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return { x: Number(cell.x) || 0, y: Number(cell.y) || 0 };
  }
  if (Array.isArray(cell)) {
    return { x: Number(cell[0]) || 0, y: Number(cell[1]) || 0 };
  }
  return { x: 0, y: 0 };
}

function computeCellBounds(cells) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cell of cells) {
    const { x, y } = resolveCellPoint(cell);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function drawMiniPreview(ctx, cells, getCellColor) {
  ctx.clearRect(0, 0, 16, 16);
  const { minX, minY, maxX, maxY } = computeCellBounds(cells);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const scale = Math.min(16 / width, 16 / height);

  ctx.save();
  ctx.scale(scale, scale);
  for (const cell of cells) {
    const { x, y } = resolveCellPoint(cell);
    const drawX = x - minX;
    const drawY = y - minY;
    const color = getCellColor(x, y);
    ctx.fillStyle = color;
    ctx.fillRect(drawX, drawY, 1, 1);
  }
  ctx.restore();
}

const ShapeListItem = memo(function ShapeListItem({
  shape,
  idx,
  colorScheme,
  onSelect,
  onRequestDelete,
  onAddRecent,
  user,
  backendBase,
}) {
  const [publicLoading, setPublicLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(!!shape.public);

  const tRef = useRef(Date.now());
  const canvasRef = useRef(null);
  const [fullShape, setFullShape] = useState(null);
  const getCellColor = useCallback((x, y) => colorScheme?.getCellColor?.(x, y, tRef.current) ?? '#4a9', [colorScheme]);
  const keyBase = shape.id || 'shape';
  const displayShape = fullShape || shape;
  const cells = useMemo(() => (displayShape?.cells || []), [displayShape]);

  // BUGFIX: Fetch full shape if needed (with debug logging)
  // Some name-only items arrive without `cells`; this effect ensures a
  // per-item hydration attempt so previews render correctly when the
  // hook-level background hydration has not completed yet.
  useEffect(() => {
    if (shape.id && !hasShapeCells(shape) && !fullShape && backendBase) {
      (async () => {
        logger.debug('[ShapeListItem] hydrate: fetching', { id: shape.id, backendBase });
        try {
          const res = await fetchShapeById(shape.id, backendBase);
          logger.debug('[ShapeListItem] hydrate: fetch result', {
            id: shape.id,
            ok: !!(res && res.ok),
            hasData: !!(res && res.data),
            cellsLen: Array.isArray(res && res.data && res.data.cells) ? res.data.cells.length : null,
          });
          if (res && res.ok && res.data) {
            setFullShape(res.data);
            logger.debug('[ShapeListItem] hydrate: setFullShape', { id: shape.id });
          }
        } catch (err) {
          logger.warn('[ShapeListItem] failed to fetch shape:', shape.id, err);
        }
      })();
    }
  }, [shape.id, shape, fullShape, backendBase]);

  // Draw mini preview
  useEffect(() => {
    if (!canvasRef.current || !cells.length) return;
    const getCtx = canvasRef.current.getContext;
    const ctx = (typeof getCtx === 'function') ? getCtx.call(canvasRef.current, '2d') : null;
    if (!ctx || typeof ctx.clearRect !== 'function') return;
    drawMiniPreview(ctx, cells, getCellColor);
  }, [cells, getCellColor]);

  const handleAddRecent = (event) => {
    event.stopPropagation();
    setTimeout(() => onAddRecent(shape), 0);
  };

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
      {user && shape?.userId !== 'system' && (
        <Tooltip title={isPublic ? 'Public (click to make private)' : 'Private (click to make public)'}>
          <span>
            <Checkbox
              icon={<PublicOffIcon fontSize="small" />}
              checkedIcon={<PublicIcon fontSize="small" />}
              checked={!!isPublic}
              disabled={publicLoading || (isPublic && shape.userId !== user.id)}
              onChange={async (e) => {
                e.stopPropagation();
                const prev = isPublic;
                // optimistic UI update
                setIsPublic(!prev);
                setPublicLoading(true);
                try {
                  const result = await updateShapePublic(shape.id, !prev);
                  setIsPublic(result.public);
                } catch (err) {
                  // revert on error
                  setIsPublic(prev);
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
  user: PropTypes.object,
  backendBase: PropTypes.string,
};

export default ShapeListItem;
