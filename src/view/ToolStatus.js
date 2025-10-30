

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
export default function ToolStatus({ selectedTool, toolStateRef, cursorCell, selectedShape, logTool }) {
  useEffect(() => {
    if (logTool) logTool(selectedTool);
  }, [selectedTool, logTool]);

  // Helper to format cell coordinates
const fmt = (cell) => cell ? `${cell.x},${cell.y}` : '—';

// Helper function to build shape description
const buildShapeDescription = (shapeInfo, cellCount, dimensions) => {
  const cellText = `${cellCount} cells`;
  if (dimensions) {
    return `"${shapeInfo}" (${cellText}, ${dimensions})`;
  }
  return `"${shapeInfo}" (${cellText})`;
};

// Helper function to get shape tool status
const getShapeToolStatus = (selectedShape, end) => {
  if (!selectedShape) {
    return 'No shape selected - Open Shape Palette to choose a pattern';
  }
  
  const shapeInfo = selectedShape.name || 'Unnamed Shape';
  const cellCount = selectedShape.cells?.length || selectedShape.pattern?.length || 0;
  const dimensions = selectedShape.width && selectedShape.height 
    ? `${selectedShape.width}×${selectedShape.height}` 
    : '';
  
  const shapeDesc = buildShapeDescription(shapeInfo, cellCount, dimensions);
  
  if (end) {
    return `Placing ${shapeDesc} at ${fmt(end)}`;
  }
  return `Ready to place ${shapeDesc} - Click to place`;
};

// Helper function to get capture tool status
const getCaptureToolStatus = (start, end, dx, dy) => {
  if (start && end) {
    const width = Math.abs(dx) + 1;
    const height = Math.abs(dy) + 1;
    return `Selecting area: ${fmt(start)} to ${fmt(end)} (${width}×${height})`;
  }
  return 'Drag to select area for capture';
};

// Helper function to get line tool status
const getLineToolStatus = (start, end, dx, dy) => {
  const deltaText = dx == null ? '—' : `${dx},${dy}`;
  return (
    <>
      Start: {fmt(start)}&nbsp;&nbsp; End: {fmt(end)}&nbsp;&nbsp; Δ: {deltaText}
    </>
  );
};

// Helper function to get default tool status
const getDefaultToolStatus = (end) => (
  <>Cursor: {end ? `${end.x},${end.y}` : '—'}</>
);

  const ts = toolStateRef?.current || {};
  const start = ts.start || ts.lastStart || null;
  const end = ts.last || cursorCell || null;

  const dx = (start && end) ? (end.x - start.x) : null;
  const dy = (start && end) ? (end.y - start.y) : null;

  // Determine status content based on selected tool
  let statusContent;
  if (selectedTool === 'line') {
    statusContent = getLineToolStatus(start, end, dx, dy);
  } else if (selectedTool === 'shapes') {
    statusContent = getShapeToolStatus(selectedShape, end);
  } else if (selectedTool === 'capture') {
    statusContent = getCaptureToolStatus(start, end, dx, dy);
  } else {
    statusContent = getDefaultToolStatus(end);
  }

  return (
    <div className="tool-status" style={{ 
      fontFamily: 'monospace', 
      fontSize: 12,
      padding: '4px 8px',
      backgroundColor: selectedTool === 'shapes' && !selectedShape ? '#fff3cd' : 'transparent',
      border: selectedTool === 'shapes' && !selectedShape ? '1px solid #ffeaa7' : 'none',
      borderRadius: '4px'
    }}>
      {statusContent}
    </div>
  );
}

ToolStatus.propTypes = {
  selectedTool: PropTypes.string.isRequired,
  toolStateRef: PropTypes.object.isRequired,
  cursorCell: PropTypes.object,
  selectedShape: PropTypes.object,
  logTool: PropTypes.func
};
