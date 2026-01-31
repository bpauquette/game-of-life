import React from 'react';
import PropTypes from 'prop-types';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

function getCellsArray(shape) {
  if (Array.isArray(shape?.cells)) return shape.cells;
  if (Array.isArray(shape)) return shape;
  return [];
}

function normalizeCellsForThumb(cells) {
  if (!cells || cells.length === 0) return { width: 1, height: 1, cells: [] };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    const x = Array.isArray(c) ? (c[0] ?? 0) : (c.x ?? 0);
    const y = Array.isArray(c) ? (c[1] ?? 0) : (c.y ?? 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  const normalized = cells.map(c => ({
    x: (Array.isArray(c) ? (c[0] ?? 0) : (c.x ?? 0)) - minX,
    y: (Array.isArray(c) ? (c[1] ?? 0) : (c.y ?? 0)) - minY
  }));
  return { width, height, cells: normalized };
}

// Lightweight preview renderer for shape cells
function ShapeThumb({ shape, onClick, colorScheme }) {
  const cells = getCellsArray(shape);
  if (!cells.length) {
    return (
      <Box onClick={onClick} sx={{ width: 64, height: 64, border: '1px dashed var(--border-subtle)', borderRadius: 1 }} />
    );
  }
  const { width, height, cells: normalized } = normalizeCellsForThumb(cells);

  return (
    <Box onClick={onClick} sx={{ cursor: 'pointer' }}>
       <svg width={64} height={64} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
         style={{ background: colorScheme?.background || 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
        {normalized.map((cell) => {
          const fill = colorScheme?.getCellColor?.(cell.x, cell.y) || '#ccc';
          const cellKey = `${cell.x}-${cell.y}`;
          return <rect key={cellKey} x={cell.x} y={cell.y} width={1} height={1} fill={fill} />;
        })}
      </svg>
    </Box>
  );
}

ShapeThumb.propTypes = {
  shape: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  onClick: PropTypes.func,
  colorScheme: PropTypes.object
};

export default function RecentShapesDrawer({ open, onClose, recentShapes, onSelectShape, colorScheme }) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      hideBackdrop={true}
      PaperProps={{ sx: { zIndex: 100 } }}
    >
      <Box sx={{ width: '100%', height: '25vh', bgcolor: 'var(--surface-modal)', color: 'var(--text-primary)', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'primary.light' }}>
          Recent Shapes (Expanded)
        </Typography>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <Grid container spacing={1} columns={6}>
            {recentShapes.map((shape, idx) => (
              <Grid key={shape?.id || shape?.name || idx} item xs={2}>
                <ShapeThumb
                  shape={shape}
                  colorScheme={colorScheme}
                  onClick={() => onSelectShape?.(shape)}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'center', opacity: 0.9, color: 'var(--text-secondary)' }} noWrap>
                  {shape?.name || shape?.meta?.name || shape?.id || `shape ${idx+1}`}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Drawer>
  );
}

RecentShapesDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  recentShapes: PropTypes.array.isRequired,
  onSelectShape: PropTypes.func.isRequired,
  colorScheme: PropTypes.object.isRequired
};
