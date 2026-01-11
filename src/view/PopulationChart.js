import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@mui/material/Tooltip';
import { Lightbulb as LightbulbIcon } from '@mui/icons-material';

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
// - isRunning: boolean indicating if simulation is running
// - position: optional fixed positioning overrides (top/right/bottom/left)
export default function PopulationChart({ history = [], onClose, isRunning = false, position, embedded = false }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  // Normalize history into parallel generation and population arrays so we can
  // plot against true generation numbers when available.
  const { generations, populations } = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) {
      return { generations: [], populations: [] };
    }
    const gens = [];
    const pops = [];
    history.forEach((entry, index) => {
      if (entry == null) return;
      if (typeof entry === 'number') {
        const v = Number.isFinite(entry) ? entry : 0;
        gens.push(index);
        pops.push(v);
      } else if (typeof entry === 'object') {
        const g = Number(
          Object.prototype.hasOwnProperty.call(entry, 'generation')
            ? entry.generation
            : index
        );
        const p = Number(
          Object.prototype.hasOwnProperty.call(entry, 'population')
            ? entry.population
            : 0
        );
        if (!Number.isFinite(g) || !Number.isFinite(p)) return;
        gens.push(g);
        pops.push(p);
      }
    });
    return { generations: gens, populations: pops };
  }, [history]);

  const isEmpty = generations.length === 0;

  const maxPop = useMemo(
    () => (populations.length === 0 ? 1 : Math.max(1, ...populations)),
    [populations]
  );

  const minGen = useMemo(
    () => (generations.length === 0 ? 0 : Math.min(...generations)),
    [generations]
  );

  const maxGen = useMemo(
    () => (generations.length === 0 ? 0 : Math.max(...generations)),
    [generations]
  );

  const genSpan = Math.max(1, maxGen - minGen || 1);
  const w = CHART_WIDTH, h = CHART_HEIGHT, pad = CHART_PADDING;

  // Build points from generations/populations
  const points = generations.map((g, i) => {
    const v = populations[i];
    const x = pad + ((g - minGen) / genSpan) * (w - pad * 2);
    const y = pad + (1 - v / maxPop) * (h - pad * 2);
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  // ticks for Y axis
  const yTicks = Y_TICK_COUNT;
  const xTicks = Math.min(
    MAX_X_TICKS,
    Math.max(
      MIN_X_TICKS,
      Math.floor(Math.max(1, genSpan) / X_TICK_INTERVAL_DIVISOR)
    )
  );

  // Build positioning style; default to top-right if not provided
  const posStyle = embedded
    ? { position: 'static', width: '100%' }
    : (() => {
        const st = { position: 'fixed', zIndex: MODAL_Z_INDEX, width: w + CHART_CONTAINER_PADDING };
        const hasCustom = position && (position.top !== undefined || position.right !== undefined || position.bottom !== undefined || position.left !== undefined);
        if (hasCustom) {
          if (position.top !== undefined) st.top = position.top;
          if (position.right !== undefined) st.right = position.right;
          if (position.bottom !== undefined) st.bottom = position.bottom;
          if (position.left !== undefined) st.left = position.left;
        } else {
          st.top = MODAL_POSITION_TOP;
          st.right = MODAL_POSITION_RIGHT;
        }
        return st;
      })();

  return (
    <div style={posStyle}>
      <div style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', padding: MODAL_PADDING, borderRadius: MODAL_BORDER_RADIUS, boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Population Over Time</strong>
          {typeof onClose === 'function' && (
            <button onClick={onClose} style={{ marginLeft: 12 }}>Close</button>
          )}
        </div>
        <svg width={w} height={h} style={{ background: 'var(--surface-3)', display: 'block' }}>
          <rect x={0} y={0} width={w} height={h} fill="var(--surface-3)" />
          {/* Y axis and ticks */}
          <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke="var(--border-subtle)" strokeOpacity={0.25} />
          <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--border-subtle)" strokeOpacity={0.25} />
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const t = i / yTicks;
            const y = pad + t * (h - pad * 2);
            const val = Math.round((1 - t) * maxPop);
            return (
              <g key={`ytick-${val}-${y.toFixed(1)}`}>
                <line x1={pad - Y_AXIS_LABEL_OFFSET} x2={pad} y1={y} y2={y} stroke="var(--border-subtle)" strokeOpacity={0.25} />
                <text x={Y_AXIS_LABEL_OFFSET} y={y + Y_AXIS_TEXT_OFFSET_Y} fontSize={CHART_FONT_SIZE} fill="var(--text-secondary)">{val}</text>
              </g>
            );
          })}

          {/* X axis ticks (generation numbers) */}
          {Array.from({ length: xTicks + 1 }, (_, i) => {
            const t = xTicks === 0 ? 0 : i / xTicks;
            const x = pad + t * (w - pad * 2);
            const gen = Math.round(minGen + t * genSpan);
            return (
              <g key={`xtick-${gen}-${x.toFixed(1)}`}>
                <line x1={x} x2={x} y1={h - pad} y2={h - pad + TICK_LENGTH} stroke="var(--border-subtle)" strokeOpacity={0.25} />
                <text x={x - AXIS_LABEL_OFFSET_X} y={h - AXIS_LABEL_OFFSET_Y} fontSize={AXIS_LABEL_FONT_SIZE} fill="var(--text-secondary)">{gen}</text>
              </g>
            );
          })}

          <path d={path} fill="none" stroke="var(--accent-primary)" strokeWidth={STROKE_WIDTH} />
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="var(--border-subtle)" strokeOpacity={0.12} />
          ))}
          
          {/* Empty state overlay */}
          {isEmpty && (
            <g>
              <rect x={0} y={0} width={w} height={h} fill="var(--overlay-backdrop)" />
              <text 
                x={w/2} 
                y={h/2 - 10} 
                fontSize={16} 
                fill="var(--text-secondary)" 
                textAnchor="middle"
                fontStyle="italic"
              >
                No data to display
              </text>
              <text 
                x={w/2} 
                y={h/2 + 15} 
                fontSize={12} 
                fill="var(--text-muted)" 
                textAnchor="middle"
              >
                Start the simulation to see population changes
              </text>
            </g>
          )}
          
          {/* points & hover */}
          {!isEmpty && points.map((p, i) => (
            <g key={`point-${i}-${p[0]}-${p[1]}`} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
              <circle cx={p[0]} cy={p[1]} r={hoverIdx === i ? POINT_RADIUS_HOVERED : POINT_RADIUS_NORMAL} fill={hoverIdx === i ? 'var(--text-primary)' : 'var(--accent-primary)'} />
              {hoverIdx === i && (
                <g>
                  <rect x={p[0] + TOOLTIP_OFFSET_X} y={p[1] - TOOLTIP_OFFSET_Y} rx={TOOLTIP_BORDER_RADIUS} ry={TOOLTIP_BORDER_RADIUS} width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} fill="var(--surface-2)" opacity={0.92} />
                  <text x={p[0] + TOOLTIP_TEXT_OFFSET_X} y={p[1] - TOOLTIP_TEXT_OFFSET_Y} fontSize={CHART_FONT_SIZE} fill="var(--text-primary)">{`Gen ${generations[i]}: ${populations[i]}`}</text>
                </g>
              )}
            </g>
          ))}
        </svg>
        <div style={{ 
          marginTop: 8, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: 12, 
          opacity: 0.8 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={isRunning ? 'Running' : 'Stopped'}>
              <LightbulbIcon 
                style={{ 
                  color: isRunning ? 'var(--accent-warning)' : 'var(--text-muted)',
                  fontSize: 18
                }} 
              />
            </Tooltip>
            <span>{isRunning ? 'Running' : 'Stopped'}</span>
          </div>
          <span>
            {isEmpty
              ? 'No data recorded'
                : `Samples: ${generations.length}, Generations: ${minGen}–${maxGen}`}
          </span>
        </div>
      </div>
    </div>
  );
}

PopulationChart.propTypes = {
  history: PropTypes.array,
  onClose: PropTypes.func,
  isRunning: PropTypes.bool,
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
  }),
  embedded: PropTypes.bool
};

PopulationChart.defaultProps = {
  history: [],
  isRunning: false
};
