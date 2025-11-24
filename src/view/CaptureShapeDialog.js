import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import { BUTTONS, STATUS } from '../utils/Constants';
// logger not needed here after preview removal

const CaptureShapeDialog = ({ 
  open, 
  onClose, 
  captureData, 
  onSave 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [isPublic, setIsPublic] = useState(false); // Default to private
  // Preview canvas removed; keep only name input ref
  const nameInputRef = useRef(null);

  // Reset form when dialog opens and focus the name field
  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setIsPublic(false); // Reset to private
    setError('');
    setSaving(false);
    requestAnimationFrame(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        if (typeof nameInputRef.current.select === 'function') {
          nameInputRef.current.select();
        }
      }
    });
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Shape name is required');
      return;
    }

    if (!captureData || captureData.cellCount === 0) {
      setError('No cells captured in the selected area');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Convert cells to the format expected by the shapes API
      const shapeData = {
        name: name.trim(),
        description: description.trim() || `Captured shape (${captureData.width}x${captureData.height})`,
        pattern: captureData.cells.map(cell => ({ x: cell.x, y: cell.y })),
        width: captureData.width,
        height: captureData.height,
        cellCount: captureData.cellCount,
        type: 'captured',
        public: isPublic, // Include public flag
        created: new Date().toISOString()
      };

      await onSave(shapeData);
      onClose();
    } catch (err) {
      const msg = err?.message || '';
      if (typeof msg === 'string' && msg.startsWith('DUPLICATE_NAME:')) {
        const dupName = msg.split(':')[1] || name.trim();
        setError(`A shape named "${dupName}" already exists.`);
        setDuplicate(true);
      } else {
        setError(msg || 'Failed to save shape');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={saving}
    >
      <DialogTitle>Save Captured Shape</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {captureData && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Capture Details
                </Typography>
                <Typography variant="body2">
                  <strong>Dimensions:</strong> {captureData.width} × {captureData.height}
                </Typography>
                <Typography variant="body2">
                  <strong>Live Cells:</strong> {captureData.cellCount}
                </Typography>
                <Typography variant="body2">
                  <strong>Density:</strong> {((captureData.cellCount / (captureData.width * captureData.height)) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          )}

          <TextField
            label="Shape Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            disabled={saving}
            error={!!error && !name.trim()}
            helperText={!!error && !name.trim() ? 'Name is required' : ''}
            inputRef={nameInputRef}
            autoFocus
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={saving}
            placeholder="Describe this shape pattern..."
          />

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={saving}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Share publicly</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Make this shape visible to all users in the community gallery
                  </Typography>
                </Box>
              }
            />
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mt: 1 }}
              action={duplicate ? (
                <>
                  <Button onClick={() => {
                    setDuplicate(false);
                    requestAnimationFrame(() => {
                      if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        if (typeof nameInputRef.current.select === 'function') nameInputRef.current.select();
                      }
                    });
                  }} size="small">Change name</Button>
                  <Button onClick={() => { if (!saving) onClose(); }} size="small">Cancel</Button>
                </>
              ) : null}
            >
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCancel} 
          disabled={saving}
        >
          {BUTTONS.CANCEL}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? STATUS.SAVING : `${BUTTONS.SAVE} Shape`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CaptureShapeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  captureData: PropTypes.shape({
    cells: PropTypes.arrayOf(PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    })).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    cellCount: PropTypes.number.isRequired
  })
};

export default CaptureShapeDialog;