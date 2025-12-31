import React from 'react';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

function DebugPanel({ debugLog }) {
  return (
    <Box sx={{ mt: 2, p: 1, bgcolor: '#222', color: '#fff', fontSize: 12, maxHeight: 200, overflow: 'auto', borderRadius: 1 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Script Debug Log</div>
      {debugLog.length === 0 && <div style={{ color: '#aaa' }}>No debug output yet.</div>}
      {debugLog.map((entry, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap' }}>
          {entry.type ? `[${entry.type}] ` : ''}{entry.line ? entry.line : ''}{entry.msg ? ' ' + entry.msg : ''}
          {entry.cells ? ` cells: ${JSON.stringify(entry.cells)}` : ''}
          {entry.key ? ` cell: ${entry.key}` : ''}
          {entry.idx !== undefined ? ` (line ${entry.idx+1})` : ''}
        </div>
      ))}
    </Box>
  );
}

DebugPanel.propTypes = {
  debugLog: PropTypes.array.isRequired,
};

export default DebugPanel;