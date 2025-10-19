import React from 'react';
import PropTypes from 'prop-types';

const fmt = (p) => (p ? `${p.x},${p.y}` : '—');

export default function ToolStatus({ selectedTool, toolStateRef, cursorCell, selectedShape }) {
  const ts = toolStateRef?.current || {};
  const start = ts.start || ts.lastStart || null;
  const end = ts.last || cursorCell || null;

  // Always show cursor position
  // If the tool has an explicit start anchor, render Start/End/Δ to preserve
  // the previous ToolStatus text format relied upon by tests.
  const dx = (start && end) ? (end.x - start.x) : null;
  const dy = (start && end) ? (end.y - start.y) : null;

  return (
    <div className="tool-status" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      {selectedShape ? <div style={{ fontSize: 11, marginBottom: 4 }}>Shape: {typeof selectedShape === 'string' ? selectedShape : (selectedShape.name || selectedShape.id || '(shape)')}</div> : null}
      {(selectedTool === 'line') ? (
        <>
          Start: {fmt(start)}&nbsp;&nbsp; End: {fmt(end)}&nbsp;&nbsp; Δ: {dx == null ? '—' : `${dx},${dy}`}
        </>
      ) : (
        <>Cursor: {end ? `${end.x},${end.y}` : '—'}</>
      )}
    </div>
  );
}

ToolStatus.propTypes = {
  selectedTool: PropTypes.string.isRequired,
  toolStateRef: PropTypes.object,
  cursorCell: PropTypes.object,
  selectedShape: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
