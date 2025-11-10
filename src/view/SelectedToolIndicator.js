import React from 'react';
import PropTypes from 'prop-types';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TOOL_DESCRIPTIONS from './components/toolDescriptions';

function SelectedToolIndicator({ selectedTool }) {
  return (
    <Paper elevation={2} sx={{ width: 180, minWidth: 180, maxWidth: 180, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
  Selected Tool: <strong>{TOOL_DESCRIPTIONS[selectedTool] || selectedTool}</strong>
      </Typography>
    </Paper>
  );
}

SelectedToolIndicator.propTypes = {
  selectedTool: PropTypes.string.isRequired
};

export default SelectedToolIndicator;
