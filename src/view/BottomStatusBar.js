import React from 'react';
import PropTypes from 'prop-types';
import GridMouseTracker from './GridMouseTracker';

function BottomStatusBar({ cursorCell }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '10px 24px',
        background: 'var(--surface-2)',
        color: 'var(--text-primary)',
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 120,
        boxShadow: '0 -6px 18px rgba(0,0,0,0.35)',
        borderTop: '1px solid var(--border-subtle)'
      }}
    >
      <GridMouseTracker position={cursorCell} />
    </div>
  );
}

BottomStatusBar.propTypes = {
  cursorCell: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  })
};

export default BottomStatusBar;
