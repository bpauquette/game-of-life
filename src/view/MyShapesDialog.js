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
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Public as PublicIcon, Lock as LockIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthProvider.js';
import { getBackendApiBase } from '../utils/backendApi.js';

const baseUrl = getBackendApiBase();

const MyShapesDialog = ({ open, onClose }) => {
  const { token, hasSupportAccess } = useAuth();
  const [shapes, setShapes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  // Load user's shapes
  const loadShapes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${baseUrl}/v1/shapes/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load shapes');
      const data = await response.json();
      setShapes(data.items);
    } catch (err) {
      console.error('MyShapesDialog: Error loading shapes', err);
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
    if (!hasSupportAccess && !currentPublic) {
      setError('Support access required to share shapes publicly.');
      return;
    }

    setToggling(shapeId);
    try {
      const response = await fetch(`${baseUrl}/v1/shapes/${shapeId}/public`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ public: !currentPublic })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update shape');
      }

      // Update local state
      setShapes((prevShapes) => prevShapes.map((shape) =>
        shape.id === shapeId ? { ...shape, public: !currentPublic } : shape
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const deleteShape = async (shapeId) => {
     
    if (!confirm('Are you sure you want to delete this shape?')) return;

    try {
      const response = await fetch(`${baseUrl}/v1/shapes/${shapeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete shape');
      setShapes((prevShapes) => prevShapes.filter((shape) => shape.id !== shapeId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>My Shapes</DialogTitle>
      <Box sx={{ px: 3, pt: 2, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            color={hasSupportAccess ? 'success' : 'default'}
            label={hasSupportAccess ? 'Support: Active' : 'Support: Standard'}
            icon={<CheckCircleIcon />}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        {!hasSupportAccess && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Private shape saves are available. Support access is required to share shapes publicly.
          </Alert>
        )}
        {hasSupportAccess && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Thank you for supporting! You can save and manage shapes here.
          </Typography>
        )}
      </Box>
      <DialogContent>
        {loading && <CircularProgress size={24} />}
        {/* Only show error if not a 404/empty response */}
        {error && error !== 'No shapes found' && <Alert severity="error">{error}</Alert>}
        {!loading && shapes.length === 0 && !error && (
          <Typography variant="body2" color="textSecondary">
            No shapes for your user.
          </Typography>
        )}
        <List>
          {shapes.map(shape => (
            <ListItem key={shape.id}>
              <ListItemText
                primary={shape.name}
                secondary={
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" color="textSecondary" style={{ marginRight: 8 }}>
                      {shape.public ? 'Public' : 'Private'}
                    </Typography>
                    <Chip
                      label={shape.type}
                      size="small"
                      style={{ backgroundColor: shape.color, color: '#fff' }}
                    />
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title={!hasSupportAccess && !shape.public ? 'Support access required to share publicly' : (shape.public ? 'Set private' : 'Set public')}>
                  <span>
                    <IconButton
                      edge="end"
                      aria-label="toggle public"
                      onClick={() => togglePublic(shape.id, shape.public)}
                      disabled={toggling === shape.id || (!hasSupportAccess && !shape.public)}
                    >
                      {shape.public ? <PublicIcon /> : <LockIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => deleteShape(shape.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MyShapesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MyShapesDialog;

