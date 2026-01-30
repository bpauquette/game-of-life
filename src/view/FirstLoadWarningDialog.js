import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { Warning as WarningIcon, Info as InfoIcon, LocalActivity as DonateIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

/**
 * First Load Warning Dialog
 * Displays important information about photosensitivity, ADA compliance,
 * and the donation/community model on app's first load.
 * Only shows once per browser (stored in localStorage).
 */
export default function FirstLoadWarningDialog({ open, onClose }) {
  const [understood, setUnderstood] = useState(false);

  const handleClose = () => {
    if (understood) {
      // Mark that user has seen this dialog
      globalThis.localStorage?.setItem('gol-first-load-warning-seen', 'true');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => {}} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      slotProps={{
        paper: {
          sx: { minHeight: '60vh' }
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontWeight: 600,
        fontSize: '1.25rem',
        py: 2
      }}>
        ⚠️ Important Health & Community Information
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        {/* Photosensitivity Warning */}
        <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Photosensitivity Warning
        </Typography>
        <Card variant="outlined" sx={{ mb: 2.5, borderLeft: '4px solid', borderLeftColor: 'error.main', bgcolor: 'var(--warning-surface)', borderColor: 'var(--warning-border)' }}>
          <CardContent sx={{ pb: 1 }}>
            <Typography sx={{ mb: 1 }}>
              <strong>Conway&apos;s Game of Life can trigger photosensitive seizures.</strong> Rapidly flashing patterns may cause seizures in people with photosensitive epilepsy or other conditions.
            </Typography>
            <Typography sx={{ mb: 1 }}>
              If you experience symptoms (dizziness, blurred vision, eye pain, muscle twitching), <strong>STOP immediately</strong> and seek medical attention.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 1.5, mb: 1 }}>
              Safe Usage: ADA Compliance Mode (enabled by default):
            </Typography>
            <List dense sx={{ ml: 0 }}>
              <ListItem disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                <ListItemText sx={{ typography: 'body2' }} primary="Limits animation to 2 FPS (safe threshold)" />
              </ListItem>
              <ListItem disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                <ListItemText sx={{ typography: 'body2' }} primary="Restricts canvas to 160×160 pixels" />
              </ListItem>
              <ListItem disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                <ListItemText sx={{ typography: 'body2' }} primary="Uses low-contrast colors to reduce flash risk" />
              </ListItem>
            </List>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              You can disable ADA Mode in Options, but doing so increases seizure risk and means you assume all legal liability.
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        {/* Two-column layout for Community and Getting Started */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {/* Community & Donation Model */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DonateIcon sx={{ color: 'primary.main' }} /> Community Features
            </Typography>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Free to use:</strong> Run simulations, explore patterns, test for photosensitivity safety.
                </Typography>
                
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}>
                  Optional Donation ($5-10):
                </Typography>
                <List dense sx={{ ml: 0 }}>
                  <ListItem disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                    <ListItemText sx={{ typography: 'caption' }} primary="Save grids and patterns" />
                  </ListItem>
                  <ListItem disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                    <ListItemText sx={{ typography: 'caption' }} primary="Publish shapes to community" />
                  </ListItem>
                  <ListItem disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>•</ListItemIcon>
                    <ListItemText sx={{ typography: 'caption' }} primary="Support ongoing development" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>

          {/* Getting Started */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: 'primary.main' }} /> Quick Start
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  1. Donate (optional):
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
                  Click heart icon → Make donation → Confirm email
                </Typography>
                
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  2. Create account:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
                  Click user icon (top right) → Register → Enter email/password
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Need help? Check Help (? icon) or visit{' '}
                  <Link href="https://conwaylife.com/wiki/Main_Page" target="_blank" rel="noopener" sx={{ fontSize: 'inherit' }}>
                    LifeWiki
                  </Link>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: 'var(--surface-modal)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            id="understand-checkbox"
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="understand-checkbox" style={{ margin: 0, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            I understand the photosensitivity risks and community model
          </label>
        </Box>
        <Button onClick={handleClose} disabled={!understood} variant="contained" color="primary">
          Got It!
        </Button>
      </DialogActions>

    </Dialog>
  );
}

FirstLoadWarningDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenRegister: PropTypes.func,
};
