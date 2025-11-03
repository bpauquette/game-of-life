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
import logger from '../controller/utils/logger';

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
  const nameInputRef = useRef(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError('');
      setSaving(false);
      // Ensure focus moves to the required field as soon as the dialog mounts
      // Use a rAF to wait for the input to be attached to the DOM
      requestAnimationFrame(() => {
        if (nameInputRef.current) {
          try { nameInputRef.current.focus(); } catch (_) {}
        }
      });
    }
  }, [open]);

  // Draw preview when capture data changes
  useEffect(() => {
    if (!open) return;
    // Schedule preview draw on next frame to ensure canvas is mounted and sized
    if (captureData) {
      requestAnimationFrame(() => {
        if (canvasRef.current) drawPreview();
      });
    }
  }, [open, captureData]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !captureData) return;
  logger.debug('Drawing preview with captureData:', captureData);

    const ctx = canvas.getContext('2d');
    let { cells, width, height } = captureData;
    // Normalize cells to objects {x,y}
    if (Array.isArray(cells)) {
      cells = cells.map(c => Array.isArray(c) ? ({ x: c[0], y: c[1] }) : ({ x: Number(c?.x ?? 0), y: Number(c?.y ?? 0) }));
    } else {
      cells = [];
    }
    // If width/height are missing or invalid, compute from cells
    if (!(Number.isFinite(width) && width > 0) || !(Number.isFinite(height) && height > 0)) {
      if (cells.length > 0) {
        const xs = cells.map(c => c.x);
        const ys = cells.map(c => c.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        width = (maxX - minX + 1) || 1;
        height = (maxY - minY + 1) || 1;
      } else {
        width = width || 0;
        height = height || 0;
      }
    }
    
  logger.debug('Preview cells:', cells, 'width:', width, 'height:', height);
    
    // Guard: nothing to draw
    if (!Array.isArray(cells) || cells.length === 0 || width <= 0 || height <= 0) {
      logger.warn('No cells to draw in preview or invalid dimensions');
      // Clear any previous content and show an empty board
      canvas.width = 200; canvas.height = 200;
      const ctx2 = canvas.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Set canvas size based on capture dimensions
    const cellSize = Math.min(10, Math.max(4, 200 / Math.max(width, height)));
    const canvasWidth = Math.max(1, Math.round(width * cellSize));
    const canvasHeight = Math.max(1, Math.round(height * cellSize));
    
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
    
  logger.debug('Drawing', cells.length, 'cells:', cells);
    
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell || !Number.isFinite(cell.x) || !Number.isFinite(cell.y)) {
        logger.error('Invalid cell at index', i, ':', cell);
        continue;
      }
      const x = cell.x * cellSize + 1;
      const y = cell.y * cellSize + 1;
      logger.debug(`Drawing cell ${i} at (${cell.x}, ${cell.y}) -> screen (${x}, ${y})`);
      ctx.fillRect(x, y, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2));
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
          <Box sx={{ p: 1, backgroundColor: '#f5f5f5', borderRadius: 1, fontSize: '0.8em' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Debug Info:
            </Typography>
            <pre aria-label="capture-debug" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
              {captureData ? JSON.stringify(captureData, null, 2) : 'null'}
            </pre>
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