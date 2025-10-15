import React, { useState, useMemo } from 'react';

// Simple interactive SVG line chart for population over time.
// Props:
// - history: array of integers (population count per generation)
// - onClose: function to close the modal
export default function PopulationChart({ history = [], onClose }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const max = useMemo(() => Math.max(1, ...history), [history]);
  const w = 640, h = 200, pad = 40;

  // Build points
  const points = history.map((v, i) => {
    const x = pad + (i / Math.max(1, history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - v / max) * (h - pad * 2);
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  // ticks for Y axis
  const yTicks = 4;
  const xTicks = Math.min(10, Math.max(2, Math.floor(history.length / 10)));

  return (
    // place modal in upper-right quadrant
    <div style={{ position: 'fixed', top: 16, right: 16, width: w + 32, zIndex: 9999 }}>
      <div style={{ background: '#111', color: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
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
                <line x1={pad - 6} x2={pad} y1={y} y2={y} stroke="rgba(255,255,255,0.2)" />
                <text x={6} y={y + 4} fontSize={12} fill="#bbb">{val}</text>
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
                <line x1={x} x2={x} y1={h - pad} y2={h - pad + 6} stroke="rgba(255,255,255,0.2)" />
                <text x={x - 8} y={h - 6} fontSize={11} fill="#bbb">{gen}</text>
              </g>
            );
          })}

          <path d={path} fill="none" stroke="#7bd" strokeWidth={2} />
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="rgba(255,255,255,0.04)" />
          ))}
          {/* points & hover */}
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
              <circle cx={p[0]} cy={p[1]} r={hoverIdx === i ? 4 : 2} fill={hoverIdx === i ? '#fff' : '#7bd'} />
              {hoverIdx === i && (
                <g>
                  <rect x={p[0] + 8} y={p[1] - 18} rx={4} ry={4} width={80} height={20} fill="#000" opacity={0.8} />
                  <text x={p[0] + 12} y={p[1] - 4} fontSize={12} fill="#fff">{history[i]}</text>
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
