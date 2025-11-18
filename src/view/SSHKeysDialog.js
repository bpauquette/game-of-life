import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  Stack
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import logger from '../controller/utils/logger';

const SSHKeysDialog = ({ open, onClose }) => {
  const [sshKeys, setSSHKeys] = useState([]);
  const [addingKey, setAddingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Load SSH keys from localStorage on mount
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem('sshKeys');
      if (storedKeys) {
        setSSHKeys(JSON.parse(storedKeys));
      }
    } catch (err) {
      logger.warn('Failed to load SSH keys:', err);
      setError('Failed to load stored SSH keys');
    }
  }, []);

  // Save SSH keys to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sshKeys', JSON.stringify(sshKeys));
    } catch (err) {
      logger.warn('Failed to save SSH keys:', err);
    }
  }, [sshKeys]);

  const handleAddKey = () => {
    if (!newKeyName.trim()) {
      setError('Key name is required');
      return;
    }
    if (!newKeyValue.trim()) {
      setError('Key value is required');
      return;
    }

    const newKey = {
      id: Date.now(),
      name: newKeyName.trim(),
      value: newKeyValue.trim(),
      dateAdded: new Date().toISOString()
    };

    setSSHKeys([...sshKeys, newKey]);
    setNewKeyName('');
    setNewKeyValue('');
    setAddingKey(false);
    setError('');
  };

  const handleDeleteKey = (keyId) => {
    setSSHKeys(sshKeys.filter(key => key.id !== keyId));
  };

  const handleCopyKey = async (keyValue) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopySuccess('Key copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      logger.warn('Failed to copy key:', err);
      setError('Failed to copy key to clipboard');
    }
  };

  const handleCancel = () => {
    setAddingKey(false);
    setNewKeyName('');
    setNewKeyValue('');
    setError('');
    setCopySuccess('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: '500px', maxHeight: '80vh' }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <VpnKeyIcon color="primary" />
        SSH Keys Management
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Manage your SSH keys for secure connections. Keys are stored locally in your browser.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {copySuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCopySuccess('')}>
            {copySuccess}
          </Alert>
        )}

        {!addingKey && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddingKey(true)}
            sx={{ mb: 2 }}
          >
            Add New SSH Key
          </Button>
        )}

        {addingKey && (
          <Card sx={{ mb: 2, p: 2, bgcolor: 'action.hover' }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  label="Key Name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., GitHub Key, Server Key"
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Public Key"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAA..."
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button onClick={handleCancel} startIcon={<CloseIcon />}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAddKey}
                    startIcon={<AddIcon />}
                  >
                    Add Key
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Divider sx={{ my: 2 }} />

        {sshKeys.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <VpnKeyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No SSH keys configured yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click "Add New SSH Key" to get started
            </Typography>
          </Box>
        ) : (
          <List>
            {sshKeys.map((key) => (
              <ListItem
                key={key.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper'
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      edge="end"
                      aria-label="copy"
                      onClick={() => handleCopyKey(key.value)}
                      size="small"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteKey(key.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <VpnKeyIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle1">{key.name}</Typography>
                      <Chip
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '500px'
                        }}
                      >
                        {key.value}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Added: {new Date(key.dateAdded).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SSHKeysDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default SSHKeysDialog;
