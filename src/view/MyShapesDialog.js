import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Public as PublicIcon, Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthProvider';
import { resolveBackendBase } from '../utils/backendApi';

const MyShapesDialog = ({ open, onClose }) => {
  const { token } = useAuth();
  const [shapes, setShapes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  // Load user's shapes
  const loadShapes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const baseUrl = resolveBackendBase();
      const response = await fetch(`${baseUrl}/v1/shapes/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load shapes');
      const data = await response.json();
      // Only user-owned shapes are returned by this endpoint
      setShapes(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && token) {
      loadShapes();
    }
  }, [open, token, loadShapes]);

  const togglePublic = async (shapeId, currentPublic) => {
    setToggling(shapeId);
    try {
      const baseUrl = resolveBackendBase();
      const response = await fetch(`${baseUrl}/v1/shapes/${shapeId}/public`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ public: !currentPublic })
      });

      if (!response.ok) throw new Error('Failed to update shape');

      // Update local state
      setShapes(shapes.map(shape =>
        shape.id === shapeId ? { ...shape, public: !currentPublic } : shape
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const deleteShape = async (shapeId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this shape?')) return;

    try {
      const baseUrl = resolveBackendBase();
      const response = await fetch(`${baseUrl}/v1/shapes/${shapeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete shape');

      // Remove from local state
      setShapes(shapes.filter(shape => shape.id !== shapeId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>My Shapes</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : shapes.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            You haven't saved any shapes yet. Use the capture tool to save interesting patterns!
          </Typography>
        ) : (
          <List>
            {shapes.map((shape) => (
              <ListItem key={shape.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">{shape.name}</Typography>
                      {shape.public ? (
                        <Chip
                          icon={<PublicIcon />}
                          label="Public"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<LockIcon />}
                          label="Private"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {shape.width} × {shape.height} • {shape.cellCount} cells
                      </Typography>
                      {shape.description && (
                        <Typography variant="body2" color="text.secondary">
                          {shape.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(shape.meta?.createdAt || shape.created).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shape.public}
                        onChange={() => togglePublic(shape.id, shape.public)}
                        disabled={toggling === shape.id}
                        size="small"
                      />
                    }
                    label="Public"
                    labelPlacement="start"
                  />
                  <IconButton
                    onClick={() => deleteShape(shape.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

MyShapesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MyShapesDialog;