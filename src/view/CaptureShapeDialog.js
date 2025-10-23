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
  CircularProgress
} from '@mui/material';
import { BUTTONS, STATUS } from '../utils/Constants';

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
  const canvasRef = useRef(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  // Draw preview when capture data changes
  useEffect(() => {
    if (captureData && canvasRef.current) {
      drawPreview();
    }
  }, [captureData]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !captureData) return;

  const logger = require('../controller/utils/logger').default || require('../controller/utils/logger');
  logger.debug('Drawing preview with captureData:', captureData);

    const ctx = canvas.getContext('2d');
    const { cells, width, height } = captureData;
    
  logger.debug('Preview cells:', cells, 'width:', width, 'height:', height);
    
    // Set canvas size based on capture dimensions
    const cellSize = Math.min(10, Math.max(4, 200 / Math.max(width, height)));
    const canvasWidth = width * cellSize;
    const canvasHeight = height * cellSize;
    
  logger.debug('Canvas setup - cellSize:', cellSize, 'canvasWidth:', canvasWidth, 'canvasHeight:', canvasHeight);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${Math.min(canvasWidth, 200)}px`;
    canvas.style.height = `${Math.min(canvasHeight, 200)}px`;

  logger.debug('Canvas DOM size:', canvas.style.width, 'x', canvas.style.height);
  logger.debug('Canvas internal size:', canvas.width, 'x', canvas.height);

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid background
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasHeight);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasWidth, y * cellSize);
      ctx.stroke();
    }
    
    // Draw live cells with high contrast
    ctx.fillStyle = '#000000'; // Black for maximum visibility
    
    if (!cells || cells.length === 0) {
  logger.warn('No cells to draw in preview!');
      return;
    }
    
  logger.debug('Drawing', cells.length, 'cells:', cells);
    
    for (const [index, cell] of cells.entries()) {
      if (!cell || typeof cell.x !== 'number' || typeof cell.y !== 'number') {
  logger.error('Invalid cell at index', index, ':', cell);
        continue;
      }
      
      const x = cell.x * cellSize + 1;
      const y = cell.y * cellSize + 1;
      
  logger.debug(`Drawing cell ${index} at (${cell.x}, ${cell.y}) -> screen (${x}, ${y})`);
      
      ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
    }
  };

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
        created: new Date().toISOString()
      };

      await onSave(shapeData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save shape');
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
          {/* Debug information */}
          <Box sx={{ p: 1, backgroundColor: '#f5f5f5', borderRadius: 1, fontSize: '0.8em', fontFamily: 'monospace' }}>
            <strong>Debug Info:</strong><br/>
            Capture Data: {captureData ? JSON.stringify(captureData, null, 2) : 'null'}
          </Box>
          
          {captureData && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Preview
                </Typography>
                <Box
                  sx={{
                    border: '2px solid #1976d2',
                    borderRadius: 1,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 120,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      border: '1px solid #666',
                      borderRadius: 2,
                      backgroundColor: '#ffffff'
                    }}
                  />
                </Box>
              </Box>
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

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
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