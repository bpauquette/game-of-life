import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Save as SaveIcon, Cancel as CancelIcon, GridOn as GridOnIcon } from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { BUTTONS, STATUS } from '../utils/Constants.js';
import logger from '../controller/utils/logger.js';

const SaveGridDialog = ({ 
  open, 
  onClose, 
  onSave, 
  loading = false,
  error = null,
  liveCellsCount = 0,
  generation = 0,
  userId = null,
  currentUserId = null,
  initialPublic = false,
  hasSupportAccess = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [isPublic, setIsPublic] = useState(!!initialPublic);
  const isSmall = useMediaQuery('(max-width:600px)');

  const handleNameChange = (event) => {
    const value = event.target.value;
    setName(value);
    
    // Validate name
    if (value.trim().length === 0) {
      setNameError('Name is required');
    } else if (value.length > 100) {
      setNameError('Name must be 100 characters or less');
    } else {
      setNameError('');
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError('Name is required');
      return;
    }
    if (trimmedName.length > 100) {
      setNameError('Name must be 100 characters or less');
      return;
    }
    try {
      await onSave(trimmedName, description.trim(), hasSupportAccess ? isPublic : false);
      // Reset form on successful save
      setName('');
      setDescription('');
      setNameError('');
      setIsPublic(false);
      onClose();
    } catch (saveError) {
      // Error handling is managed by the parent component
      logger.warn('Save failed:', saveError.message);
    }
  };

  const handleCancel = () => {
    // Reset form when canceling
    setName('');
    setDescription('');
    setNameError('');
    setIsPublic(false);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !nameError && name.trim()) {
      event.preventDefault();
      handleSave();
    }
  };

  const isValid = name.trim().length > 0 && !nameError;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      fullScreen={isSmall}
      slotProps={{
        paper: {
          sx: { minHeight: '300px', ...(isSmall ? { height: '100%' } : {}) }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <GridOnIcon color="primary" />
        Save Grid State
      </DialogTitle>
      
      <DialogContent sx={{ overflowY: 'auto', ...(isSmall ? { flex: 1 } : { maxHeight: '60vh' }) }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Save the current grid state to load it back later.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${liveCellsCount} live cells`} 
            variant="outlined" 
            size="small"
            color="primary"
          />
          <Chip 
            label={`Generation ${generation}`} 
            variant="outlined" 
            size="small"
            color="secondary"
          />
        </Box>

        <TextField
          autoFocus
          margin="dense"
          label="Grid Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          error={!!nameError}
          helperText={nameError || 'Enter a name for this grid state'}
          disabled={loading}
          sx={{ mb: 2 }}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={hasSupportAccess ? isPublic : false}
              onChange={e => setIsPublic(e.target.checked)}
              disabled={!!userId && currentUserId !== userId || !hasSupportAccess}
              color="primary"
            />
          }
          label={isPublic ? 'Public grid (visible to all users)' : 'Private grid (only you can see)'}
          sx={{ mb: 2 }}
        />
        {!hasSupportAccess && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Private grid saves are available. Support access is required to publish grids publicly.
          </Alert>
        )}

        <TextField
          margin="dense"
          label="Description (optional)"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={description}
          onChange={handleDescriptionChange}
          disabled={loading}
          placeholder="Add a description for this grid state..."
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${description.length}/500 characters`}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, ...(isSmall ? { position: 'sticky', bottom: 0, backgroundColor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' } : {}) }}>
        <Button 
          onClick={handleCancel}
          disabled={loading}
          startIcon={<CancelIcon />}
        >
          {BUTTONS.CANCEL}
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!isValid || loading}
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} /> : <SaveIcon />}
        >
          {(() => {
            if (loading) return STATUS.SAVING;
            if (isSmall) return BUTTONS.SAVE;
            return `${BUTTONS.SAVE} Grid`;
          })()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SaveGridDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  liveCellsCount: PropTypes.number,
  generation: PropTypes.number,
  userId: PropTypes.string,
  currentUserId: PropTypes.string,
  initialPublic: PropTypes.bool,
  hasSupportAccess: PropTypes.bool
};

export default SaveGridDialog;

