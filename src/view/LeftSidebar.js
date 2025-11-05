import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import ToolGroup from './components/ToolGroup';
import RecentShapesStrip from './RecentShapesStrip';

export default function LeftSidebar({
  recentShapes,
  onSelectShape,
  drawWithOverlay,
  colorScheme,
  selectedShape,
  onRotateShape,
  onSwitchToShapesTool,
  openPalette,
  selectedTool,
  setSelectedTool,
  open = true,
  isSmall = false,
  topOffset = 48,
  showToolGroup = false
}) {
  return (
    <Box
      className="left-sidebar"
      sx={{
        position: 'fixed',
        top: topOffset, // below header (and optional tools bar)
        left: 0,
        bottom: 0,
        width: 180,
        minWidth: 180,
        background: '#222',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        zIndex: 25,
        overflowY: 'auto',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 200ms ease'
      }}
      aria-hidden={!open}
    >
      {showToolGroup && (
        <Box sx={{ mb: 1 }}>
          <ToolGroup selectedTool={selectedTool} setSelectedTool={setSelectedTool} isSmall={isSmall} />
        </Box>
      )}

      <RecentShapesStrip
        recentShapes={recentShapes}
        selectShape={onSelectShape}
        drawWithOverlay={drawWithOverlay}
        colorScheme={colorScheme}
        selectedShape={selectedShape}
        maxSlots={10}
        onRotateShape={onRotateShape}
        onSwitchToShapesTool={onSwitchToShapesTool}
        openPalette={openPalette}
      />
    </Box>
  );
}

LeftSidebar.propTypes = {
  recentShapes: PropTypes.array,
  onSelectShape: PropTypes.func,
  drawWithOverlay: PropTypes.func,
  colorScheme: PropTypes.object,
  selectedShape: PropTypes.object,
  onRotateShape: PropTypes.func,
  onSwitchToShapesTool: PropTypes.func,
  openPalette: PropTypes.func,
  selectedTool: PropTypes.string,
  setSelectedTool: PropTypes.func,
  open: PropTypes.bool,
  isSmall: PropTypes.bool,
  topOffset: PropTypes.number,
  showToolGroup: PropTypes.bool
};
