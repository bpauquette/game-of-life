import React from 'react';

const fmt = (p) => (p ? `${p.x},${p.y}` : '—');

export default function ToolStatus({ selectedTool, toolStateRef, cursorCell }) {
  const ts = toolStateRef?.current || {};
  if (selectedTool === 'line') {
    const start = ts.start || ts.lastStart || null;
    const end = ts.last || cursorCell || null;
    const dx = (start && end) ? (end.x - start.x) : null;
    const dy = (start && end) ? (end.y - start.y) : null;
    return (
      <div className="tool-status" style={{ fontFamily: 'monospace', fontSize: 12 }}>
        Start: {fmt(start)}&nbsp;&nbsp; End: {fmt(end)}&nbsp;&nbsp; Δ: {dx == null ? '—' : `${dx},${dy}`}
      </div>
    );
  }
  return (
    <div className="tool-status" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      Cursor: {cursorCell ? `${cursorCell.x},${cursorCell.y}` : '—'}
    </div>
  );
}
