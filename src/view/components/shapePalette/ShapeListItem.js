import React, { useRef, memo } from 'react';
import PropTypes from 'prop-types';
import ListItem from '@mui/material/ListItem';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { Delete as DeleteIcon } from '@mui/icons-material';
import logger from '../../../controller/utils/logger';

const ShapeListItem = memo(function ShapeListItem({
  shape,
  idx,
  colorScheme,
  onSelect,
  onRequestDelete,
  onAddRecent,
  onHover,
}) {
  const tRef = useRef(Date.now());
  const getCellColor = (x, y) => colorScheme?.getCellColor?.(x, y, tRef.current) ?? '#4a9';
  const keyBase = shape.id || 'shape';

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
    <ListItem key={`${keyBase}-${idx}`} disablePadding>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <IconButton
          aria-label="Add to Recent"
          size="small"
          sx={{ mr: 1, color: '#388e3c', bgcolor: 'rgba(56,142,60,0.08)', borderRadius: 1 }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
          onClick={handleAddRecent}
          data-testid={`add-recent-btn-${keyBase}`}
        >
          <Tooltip title="Add to Recent Shapes" placement="left">
            <span>
              <svg width={20} height={20} viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
                <circle cx={10} cy={10} r={9} fill="#388e3c" opacity={0.15} />
                <path d="M6 10h8M10 6v8" stroke="#388e3c" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </span>
          </Tooltip>
        </IconButton>
        <ListItemButton
          onClick={() => onSelect(shape)}
          sx={{ flex: 1 }}
          onMouseEnter={() => onHover?.(hoverId)}
          onMouseLeave={() => onHover?.(null)}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5, fontFamily: 'monospace' }}
              data-testid="shape-label"
            >
              {shape.name || '(unnamed)'}
            </Typography>
          </Box>
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
};

export default ShapeListItem;
