import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Chip 
} from '@mui/material';

const DebugPanel = ({ debugLog }) => {
  if (!debugLog || debugLog.length === 0) {
    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: '#0b0b0d', 
        borderRadius: 1, 
        border: '1px solid #444',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="body2" color="rgba(255,255,255,0.5)">
          No debug output. Run a script to see execution details.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '400px', 
      overflow: 'auto', 
      bgcolor: '#0b0b0d', 
      borderRadius: 1, 
      border: '1px solid #444'
    }}>
      <List dense>
        {debugLog.map((entry, idx) => (
          <React.Fragment key={idx}>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={entry.type} 
                      size="small" 
                      color={getChipColor(entry.type)}
                      sx={{ minWidth: 60, fontSize: '0.7rem' }}
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        color: getTextColor(entry.type)
                      }}
                    >
                      {entry.msg || 'No message'}
                    </Typography>
                  </Box>
                }
                secondary={entry.details && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      color: 'rgba(255,255,255,0.5)',
                      ml: 8 
                    }}
                  >
                    {JSON.stringify(entry.details)}
                  </Typography>
                )}
              />
            </ListItem>
            {idx < debugLog.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

function getChipColor(type) {
  switch (type) {
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'command': return 'info';
    case 'state': return 'success';
    default: return 'default';
  }
}

function getTextColor(type) {
  switch (type) {
    case 'error': return '#ff6b6b';
    case 'warning': return '#ffd93d';
    case 'command': return '#74c0fc';
    case 'state': return '#69db7c';
    default: return '#fff';
  }
}

DebugPanel.propTypes = {
  debugLog: PropTypes.array.isRequired,
};

export default DebugPanel;