import React from 'react';

const fmt = (p) => (p ? `${p.x},${p.y}` : '—');

export default function ToolStatus({ selectedTool, toolStateRef, cursorCell }) {
  const ts = toolStateRef?.current || {};
  const anchor = ts.start || ts.lastStart || null;
  const cursor = cursorCell || ts.last || null;

  // Always show cursor position
  // If the tool has an anchor/start (two-point mode), show Anchor + Cursor + delta
  const dx = (anchor && cursor) ? (cursor.x - anchor.x) : null;
  const dy = (anchor && cursor) ? (cursor.y - anchor.y) : null;

  return (
    <div className="tool-status" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      {anchor ? (
        <>
          Anchor: {fmt(anchor)}&nbsp;&nbsp; Cursor: {fmt(cursor)}&nbsp;&nbsp; Δ: {dx == null ? '—' : `${dx},${dy}`}
        </>
      ) : (
        <>Cursor: {cursor ? `${cursor.x},${cursor.y}` : '—'}</>
      )}
    </div>
  );
}
