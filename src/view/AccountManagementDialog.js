import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { getBackendApiBase } from '../utils/backendApi';
import { useAuth } from '../auth/AuthProvider';

/**
 * AccountManagementDialog - GDPR/CCPA compliant account management
 * 
 * Features:
 * - Export user data (GDPR Article 20 - Right to Data Portability)
 * - Schedule account deletion (GDPR Article 17 - Right to Erasure)
 * - Cancel scheduled deletion (30-day grace period)
 * - View deletion status and countdown
 */
export default function AccountManagementDialog({ open, onClose }) {
  const backendUrl = getBackendApiBase();
  const { hasDonated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchDeletionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setError('You must be logged in to view account status');
        return;
      }

      const response = await fetch(`${backendUrl}/v1/auth/account/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account status: ${response.statusText}`);
      }

      const data = await response.json();
      setDeletionStatus(data);
    } catch (err) {
      console.error('Error fetching deletion status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  // Fetch deletion status when dialog opens
  useEffect(() => {
    if (open) {
      fetchDeletionStatus();
    }
  }, [open, fetchDeletionStatus]);

  const handleExportData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setError('You must be logged in to export data');
        return;
      }

      const response = await fetch(`${backendUrl}/v1/auth/account/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `game-of-life-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Your data has been exported successfully');
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleDeletion = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setError('You must be logged in to delete your account');
        return;
      }

      const response = await fetch(`${backendUrl}/v1/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gracePeriodDays: 30 })
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule deletion: ${response.statusText}`);
      }

      const data = await response.json();
      setSuccess(`Account deletion scheduled. Your account will be permanently deleted on ${new Date(data.deletionDate).toLocaleDateString()}`);
      setShowDeleteConfirm(false);
      await fetchDeletionStatus();
    } catch (err) {
      console.error('Error scheduling deletion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setError('You must be logged in to cancel deletion');
        return;
      }

      const response = await fetch(`${backendUrl}/v1/auth/account/cancel-deletion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel deletion: ${response.statusText}`);
      }

      setSuccess('Account deletion has been cancelled');
      await fetchDeletionStatus();
    } catch (err) {
      console.error('Error cancelling deletion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoIcon color="primary" />
          <Typography variant="h6">Account & Privacy Settings</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" my={4}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading account information...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<WarningIcon />}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            <AlertTitle>Success</AlertTitle>
            {success}
          </Alert>
        )}

        {!loading && (
          <>
            {/* Donation Status */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                color={hasDonated ? 'success' : 'default'}
                label={hasDonated ? 'Donation Status: Verified' : 'Donation Status: Not donated'}
                icon={<CheckCircleIcon />}
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" color="text.secondary">
                {hasDonated ? 'Thank you for supporting the project.' : 'Donate to enable saving grids, shapes, and scripts.'}
              </Typography>
            </Box>
            {/* Account Status Summary */}
            {!deletionStatus?.deletionScheduled && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body1" fontWeight="bold">Account Active</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Your account is in good standing
                </Typography>
              </Box>
            )}

            {/* Deletion Status */}
            {deletionStatus?.deletionScheduled && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon />
                  Account Deletion Scheduled
                </AlertTitle>
                <Typography variant="body2" paragraph>
                  Your account will be permanently deleted on{' '}
                  <Chip 
                    label={new Date(deletionStatus.deletionDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} 
                    size="small" 
                    color="warning"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Typography>
                {deletionStatus.daysRemaining > 0 && (
                  <Typography variant="body2" paragraph>
                    <strong>{deletionStatus.daysRemaining} days</strong> remaining to cancel
                  </Typography>
                )}
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelDeletion}
                    disabled={loading}
                  >
                    Cancel Deletion & Keep Account
                  </Button>
                </Box>
              </Alert>
            )}

            {/* Data Export Section */}
            <Box mb={3} sx={{ p: 2, bgcolor: 'rgba(33, 150, 243, 0.05)', borderRadius: 1, border: '1px solid rgba(33, 150, 243, 0.2)' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <DownloadIcon color="primary" />
                <Typography variant="h6">Export Your Data</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Download all your data including shapes, collections, and metadata in JSON format.
                This complies with <strong>GDPR Article 20</strong> (Right to Data Portability) and <strong>CCPA Section 1798.110</strong>.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleExportData}
                disabled={loading}
                sx={{ minWidth: 180 }}
              >
                {loading ? 'Downloading...' : 'Download My Data'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Account Deletion Section */}
            {!deletionStatus?.deletionScheduled && !showDeleteConfirm && (
              <Box sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 1, border: '1px solid rgba(244, 67, 54, 0.2)' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <DeleteIcon color="error" />
                  <Typography variant="h6">Delete Your Account</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Permanently delete your account and all associated data. You'll have a <strong>30-day grace period</strong> to cancel before deletion becomes final.
                  Complies with <strong>GDPR Article 17</strong> (Right to Erasure) and <strong>CCPA Section 1798.105</strong>.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  sx={{ borderWidth: 2, '&:hover': { borderWidth: 2 } }}
                >
                  Delete My Account
                </Button>
              </Box>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && !deletionStatus?.deletionScheduled && (
              <Box sx={{ p: 3, bgcolor: 'rgba(244, 67, 54, 0.08)', borderRadius: 1, border: '2px solid rgba(244, 67, 54, 0.5)' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <WarningIcon color="error" sx={{ fontSize: 32 }} />
                  <Typography variant="h6" color="error">Confirm Account Deletion</Typography>
                </Box>
                <Typography variant="body2" paragraph sx={{ fontWeight: 500 }}>
                  Are you absolutely sure? This action will:
                </Typography>
                <List dense sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText 
                      primary="Delete all your private shapes, grids, and scripts" 
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><InfoIcon fontSize="small" color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="Anonymize your public contributions (attributed to 'Deleted User')" 
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText 
                      primary="Remove all your personal information (email, name, etc.)" 
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="30-day grace period to cancel before permanent deletion" 
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: 'success.main' }}
                    />
                  </ListItem>
                </List>
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                    onClick={handleScheduleDeletion}
                    disabled={loading}
                    sx={{ fontWeight: 600 }}
                  >
                    {loading ? 'Processing...' : 'Yes, Delete My Account'}
                  </Button>
                  <Button
                    variant="contained"
                    color="inherit"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    sx={{ fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
