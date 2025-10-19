import React, { useState, useMemo } from 'react';

// Chart dimensions and styling constants
const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;
const CHART_CONTAINER_PADDING = 32;
const MODAL_POSITION_TOP = 16;
const MODAL_POSITION_RIGHT = 16;
const MODAL_Z_INDEX = 9999;
const MODAL_PADDING = 12;
const MODAL_BORDER_RADIUS = 6;
const Y_TICK_COUNT = 4;
const MAX_X_TICKS = 10;
const MIN_X_TICKS = 2;
const X_TICK_INTERVAL_DIVISOR = 10;
const TICK_LENGTH = 6;
const STROKE_WIDTH = 2;
const POINT_RADIUS_NORMAL = 2;
const POINT_RADIUS_HOVERED = 4;
const TOOLTIP_OFFSET_X = 8;
const TOOLTIP_OFFSET_Y = 18;
const TOOLTIP_WIDTH = 80;
const TOOLTIP_HEIGHT = 20;
const TOOLTIP_BORDER_RADIUS = 4;
const TOOLTIP_TEXT_OFFSET_X = 12;
const TOOLTIP_TEXT_OFFSET_Y = 4;
const CHART_FONT_SIZE = 12;
const AXIS_LABEL_FONT_SIZE = 11;
const AXIS_LABEL_OFFSET_X = 8;
const AXIS_LABEL_OFFSET_Y = 6;
const Y_AXIS_LABEL_OFFSET = 6;
const Y_AXIS_TEXT_OFFSET_Y = 4;

// Simple interactive SVG line chart for population over time.
// Props:
// - history: array of integers (population count per generation)
// - onClose: function to close the modal
export default function PopulationChart({ history = [], onClose }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const max = useMemo(() => Math.max(1, ...history), [history]);
  const w = CHART_WIDTH, h = CHART_HEIGHT, pad = CHART_PADDING;

  // Build points
  const points = history.map((v, i) => {
    const x = pad + (i / Math.max(1, history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - v / max) * (h - pad * 2);
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  // ticks for Y axis
  const yTicks = Y_TICK_COUNT;
  const xTicks = Math.min(MAX_X_TICKS, Math.max(MIN_X_TICKS, Math.floor(history.length / X_TICK_INTERVAL_DIVISOR)));

  return (
    // place modal in upper-right quadrant
    <div style={{ position: 'fixed', top: MODAL_POSITION_TOP, right: MODAL_POSITION_RIGHT, width: w + CHART_CONTAINER_PADDING, zIndex: MODAL_Z_INDEX }}>
      <div style={{ background: '#111', color: '#fff', padding: MODAL_PADDING, borderRadius: MODAL_BORDER_RADIUS, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Population Over Time</strong>
          <button onClick={onClose} style={{ marginLeft: 12 }}>Close</button>
        </div>
        <svg width={w} height={h} style={{ background: '#020202', display: 'block' }}>
          <rect x={0} y={0} width={w} height={h} fill="#020202" />
          {/* Y axis and ticks */}
          <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke="rgba(255,255,255,0.2)" />
          <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="rgba(255,255,255,0.2)" />
          {[...Array(yTicks + 1)].map((_, i) => {
            const t = i / yTicks;
            const y = pad + t * (h - pad * 2);
            const val = Math.round((1 - t) * max);
            return (
              <g key={`yt-${i}`}>
                <line x1={pad - Y_AXIS_LABEL_OFFSET} x2={pad} y1={y} y2={y} stroke="rgba(255,255,255,0.2)" />
                <text x={Y_AXIS_LABEL_OFFSET} y={y + Y_AXIS_TEXT_OFFSET_Y} fontSize={CHART_FONT_SIZE} fill="#bbb">{val}</text>
              </g>
            );
          })}

          {/* X axis ticks (generation numbers) */}
          {[...Array(xTicks + 1)].map((_, i) => {
            const t = i / xTicks;
            const x = pad + t * (w - pad * 2);
            const gen = Math.round(t * Math.max(0, history.length - 1));
            return (
              <g key={`xt-${i}`}>
                <line x1={x} x2={x} y1={h - pad} y2={h - pad + TICK_LENGTH} stroke="rgba(255,255,255,0.2)" />
                <text x={x - AXIS_LABEL_OFFSET_X} y={h - AXIS_LABEL_OFFSET_Y} fontSize={AXIS_LABEL_FONT_SIZE} fill="#bbb">{gen}</text>
              </g>
            );
          })}

          <path d={path} fill="none" stroke="#7bd" strokeWidth={STROKE_WIDTH} />
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="rgba(255,255,255,0.04)" />
          ))}
          {/* points & hover */}
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
              <circle cx={p[0]} cy={p[1]} r={hoverIdx === i ? POINT_RADIUS_HOVERED : POINT_RADIUS_NORMAL} fill={hoverIdx === i ? '#fff' : '#7bd'} />
              {hoverIdx === i && (
                <g>
                  <rect x={p[0] + TOOLTIP_OFFSET_X} y={p[1] - TOOLTIP_OFFSET_Y} rx={TOOLTIP_BORDER_RADIUS} ry={TOOLTIP_BORDER_RADIUS} width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} fill="#000" opacity={0.8} />
                  <text x={p[0] + TOOLTIP_TEXT_OFFSET_X} y={p[1] - TOOLTIP_TEXT_OFFSET_Y} fontSize={CHART_FONT_SIZE} fill="#fff">{history[i]}</text>
                </g>
              )}
            </g>
          ))}
        </svg>
        <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, opacity: 0.8 }}>Generations: {history.length}</div>
      </div>
    </div>
  );
}
