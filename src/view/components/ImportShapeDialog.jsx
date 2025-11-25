import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useAuth } from '../../auth/AuthProvider';

const ImportShapeDialog = ({ open, onClose, onImportSuccess }) => {
  const { token } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!input.trim()) {
      setError('Please enter a URL or RLE');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For now, assume token is stored in localStorage or something
      // In a real app, you'd get it from auth context
      const response = await fetch('http://localhost:55000/v1/import-rle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          rle: input,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed: ${response.status}`);
      }

      const importedShape = await response.json();
      onImportSuccess?.(importedShape);
      onClose();
      setInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setInput('');
      setError('');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Shape</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Enter a LifeWiki URL or paste RLE data directly. The shape will be added to your catalogue.
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="URL or RLE"
          multiline
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://conwaylife.com/wiki/Galumpher or paste RLE here..."
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ImportShapeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onImportSuccess: PropTypes.func,
};

export default ImportShapeDialog;