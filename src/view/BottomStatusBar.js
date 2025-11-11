import React from 'react';
import PropTypes from 'prop-types';

// Minimal BottomStatusBar stub. Expand as needed for your app.
function BottomStatusBar({ status, children }) {
  return (
    <div style={{ width: '100%', padding: '8px', background: '#222', color: '#eee', fontSize: '0.95em', position: 'fixed', bottom: 0, left: 0, zIndex: 100 }}>
      {status ? <span>{status}</span> : null}
      {children}
    </div>
  );
}

BottomStatusBar.propTypes = {
  status: PropTypes.string,
  children: PropTypes.node
};

export default BottomStatusBar;
