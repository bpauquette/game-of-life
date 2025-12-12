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

const baseUrl = (typeof window !== 'undefined' && window.location)
  ? window.location.origin + '/api'
  : process.env.REACT_APP_API_BASE || 'http://localhost:55000';

const MyShapesDialog = ({ open, onClose }) => {
  const { token } = useAuth();
  const [shapes, setShapes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  // Load user's shapes
  const loadShapes = useCallback(async () => {
    console.log('MyShapesDialog: Loading shapes, token present:', !!token);
    setLoading(true);
    setError('');
    try {
      console.log('MyShapesDialog: Fetching from', `${baseUrl}/v1/shapes/my`);
      const response = await fetch(`${baseUrl}/v1/shapes/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('MyShapesDialog: Response status', response.status);
      if (!response.ok) throw new Error('Failed to load shapes');
      const data = await response.json();
      console.log('MyShapesDialog: Loaded shapes', data.items?.length || 0);
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
      const response = await fetch(`${baseUrl}/v1/shapes/${shapeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete shape');
      setShapes(shapes.filter(shape => shape.id !== shapeId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>My Shapes</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress size={24} />}
        {error && <Alert severity="error">{error}</Alert>}
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
                <IconButton
                  edge="end"
                  aria-label="toggle public"
                  onClick={() => togglePublic(shape.id, shape.public)}
                  disabled={toggling === shape.id}
                >
                  {shape.public ? <PublicIcon /> : <LockIcon />}
                </IconButton>
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