import React from 'react';
import PropTypes from 'prop-types';

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  fontFamily: 'monospace',
  fontSize: '0.95rem'
};

const badgeStyle = {
  display: 'flex',
  flexDirection: 'column',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#aaa'
};

const valueStyle = {
  color: '#fff',
  fontSize: '1.4rem'
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
        <span>Grid X</span>
        <span style={valueStyle}>{x}</span>
      </div>
      <div style={badgeStyle}>
        <span>Grid Y</span>
        <span style={valueStyle}>{y}</span>
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
