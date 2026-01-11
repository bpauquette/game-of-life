import React, { useEffect } from 'react';
import useToolStateObserver from './hooks/useToolStateObserver';
import PropTypes from 'prop-types';
import TOOL_DESCRIPTIONS from './components/toolDescriptions';
function fmt(cell) {
  return cell ? `${cell.x},${cell.y}` : '—';
}


function getShapeToolStatus(selectedShape, cursorCell) {
  if (!selectedShape) {
    return <span>No shape selected - Open Shape Palette to choose a pattern</span>;
  }
  const shapeInfo = selectedShape.name || 'Unnamed Shape';
  const cellCount = selectedShape.cells?.length || selectedShape.pattern?.length || 0;
  const dimensions =
    selectedShape.width && selectedShape.height
      ? `${selectedShape.width}×${selectedShape.height}`
      : '';
  return (
    <span>
      {`Placing "${shapeInfo}" (${cellCount} cells${dimensions ? ', ' + dimensions : ''}) at ${cursorCell ? fmt(cursorCell) : '—'}`}
    </span>
  );
}

// Helpers to reduce complexity in ToolStatus
const twoPointToolsSet = new Set(['line', 'rect', 'square', 'oval', 'circle', 'capture', 'randomRect']);

function isTwoPointTool(tool) {
  return twoPointToolsSet.has(tool);
}

function renderTwoPointStatus(toolState) {
  const hasStart = !!toolState?.start;
  const hasLast = !!toolState?.last;
  const startText = hasStart ? fmt(toolState.start) : '—';
  const endText = hasLast ? fmt(toolState.last) : '—';
  const deltaText =
    hasStart && hasLast
      ? `${toolState.last.x - toolState.start.x},${toolState.last.y - toolState.start.y}`
      : '—';
  return (
    <span>
      Start: {startText}  End: {endText}  Δ: {deltaText}
    </span>
  );
}

function renderCursorStatus(cursorCell) {
  return <span>Cursor: {cursorCell ? fmt(cursorCell) : ''};</span>;
}

function renderShapeStatus(selectedShape, cursorCell) {
  return getShapeToolStatus(selectedShape, cursorCell);
}

function ToolStatus({ selectedTool, toolStateRef, cursorCell, selectedShape, logTool, model }) {
  // Use observer hook for live tool state (model-driven)
  const toolState = useToolStateObserver({ model, toolStateRef });
  useEffect(() => {
    if (logTool) logTool(selectedTool);
  }, [selectedTool, logTool]);

  let statusContent;
  if (selectedTool === 'shapes') {
    statusContent = renderShapeStatus(selectedShape, cursorCell);
  } else if (isTwoPointTool(selectedTool)) {
    statusContent = renderTwoPointStatus(toolState);
  } else {
    statusContent = renderCursorStatus(cursorCell);
  }

  const highlight = selectedTool === 'shapes' && !selectedShape;
  return (
    <div
      className="tool-status"
      style={{
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '4px 8px',
        backgroundColor: highlight ? 'var(--warning-surface)' : 'transparent',
        border: highlight ? '1px solid var(--warning-border)' : 'none',
        borderRadius: '4px',
      }}
    >
      <span style={{ fontWeight: 600, marginRight: 8 }}>{TOOL_DESCRIPTIONS[selectedTool] || selectedTool}</span>
      {statusContent}
    </div>
  );
}

ToolStatus.propTypes = {
  selectedTool: PropTypes.string.isRequired,
  toolStateRef: PropTypes.object.isRequired,
  cursorCell: PropTypes.object,
  selectedShape: PropTypes.object,
  logTool: PropTypes.func,
  model: PropTypes.object
};
export default ToolStatus;
