import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

function DeleteConfirmDialog({ open, shape, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Delete shape?</DialogTitle>
      <DialogContent>
        Are you sure you want to delete <strong>{shape?.name || shape?.meta?.name || 'this shape'}</strong>? This cannot be undone.
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onConfirm(shape)} color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DeleteConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  shape: PropTypes.object,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
};

export default DeleteConfirmDialog;
