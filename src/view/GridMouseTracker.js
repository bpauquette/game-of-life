import React from 'react';
import PropTypes from 'prop-types';

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: '0.95rem'
};

const badgeStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '8px'
};

const valueStyle = {
  color: 'var(--text-primary)',
  fontSize: '1.05rem',
  fontFamily: 'monospace',
  fontWeight: 700,
  lineHeight: 1
};

const formatValue = (val) => (Number.isFinite(val) ? val : '—');

/**
 * Presentational widget that shows the current cursor position in grid
 * coordinates. The parent component is responsible for tracking the mouse
 * over the simulation canvas and passing the latest `position` down.
 */
const GridMouseTracker = ({ position }) => {
  const x = formatValue(position?.x);
  const y = formatValue(position?.y);

  return (
    <div style={containerStyle}>
      <div style={badgeStyle}>
        <span style={valueStyle}>{`${x}, ${y}`}</span>
      </div>
    </div>
  );
};

GridMouseTracker.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  })
};

export default GridMouseTracker;
