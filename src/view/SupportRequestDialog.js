import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useAuth } from '../auth/AuthProvider.jsx';
import { submitSupportRequest } from '../utils/backendApi.js';

export default function SupportRequestDialog({ open, onClose }) {
  const { email } = useAuth();
  const [contactInfo, setContactInfo] = useState('');
  const [requestText, setRequestText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSuccess(null);
    setRequestText('');
    setContactInfo(String(email || '').trim());
  }, [open, email]);

  const isValid = useMemo(() => {
    return contactInfo.trim().length > 0 && requestText.trim().length > 0;
  }, [contactInfo, requestText]);

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess(null);
    try {
      const response = await submitSupportRequest({
        contactInfo,
        requestText
      });
      setSuccess({
        requestId: response.requestId || 'N/A',
        requestedAt: response.requestedAt || new Date().toISOString()
      });
      setRequestText('');
    } catch (err) {
      setError(String(err?.message || 'Failed to submit support request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Support</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            User captured: {email ? email : 'N/A'}
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? (
            <Alert severity="success">
              Request submitted. Reference ID: {success.requestId}. Time: {success.requestedAt}
            </Alert>
          ) : null}
          <TextField
            label="Contact Info"
            value={contactInfo}
            onChange={(event) => setContactInfo(event.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 320 }}
            helperText="Required. Email or another reliable way to contact you."
          />
          <TextField
            label="Support Request"
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            required
            fullWidth
            multiline
            minRows={5}
            inputProps={{ maxLength: 5000 }}
            helperText="Required. Describe what you need help with."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Close</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || submitting}>
          {submitting ? 'Submitting...' : 'Request Support'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SupportRequestDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func
};

SupportRequestDialog.defaultProps = {
  open: false,
  onClose: () => {}
};
