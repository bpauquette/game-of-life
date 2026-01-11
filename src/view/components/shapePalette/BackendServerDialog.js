import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { Close as CloseIcon, Undo as UndoIcon } from '@mui/icons-material';

function BackendServerDialog({ open, onClose, backendError, backendStarting, onRetry, onShowInstructions }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="h2">Backend Server Not Found</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          The shapes catalog backend server doesn't appear to be running. You need to start it to access the shapes catalog.
        </Typography>
        {backendError && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" component="pre" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {backendError}
            </Typography>
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          The backend provides access to a catalog of Conway's Game of Life patterns and shapes.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onRetry}
          variant="outlined"
          disabled={backendStarting}
          startIcon={backendStarting ? <CircularProgress size={16} /> : <UndoIcon />}
        >
          {backendStarting ? 'Checking...' : 'Retry Connection'}
        </Button>
        <Button onClick={onShowInstructions} variant="contained" disabled={backendStarting}>
          Show Instructions
        </Button>
      </DialogActions>
    </Dialog>
  );
}

BackendServerDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  backendError: PropTypes.string,
  backendStarting: PropTypes.bool,
  onRetry: PropTypes.func,
  onShowInstructions: PropTypes.func,
};

export default BackendServerDialog;
