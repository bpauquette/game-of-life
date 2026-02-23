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
import { Warning as WarningIcon, Info as InfoIcon, LocalActivity as SupportIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { ADA_LEGAL_LIABILITY_NOTICE } from './legalNotices.js';
import { useUiDao } from '../model/dao/uiDao.js';

/**
 * First Load Warning Dialog
 * Displays important information about photosensitivity, ADA compliance,
 * and the support/community model on app's first load.
 * Only shows once per browser (stored in localStorage).
 */
export default function FirstLoadWarningDialog({ open, onClose }) {
  const [understood, setUnderstood] = useState(false);
  const enableAdaCompliance = useUiDao((state) => state.enableAdaCompliance);
  const setEnableAdaCompliance = useUiDao((state) => state.setEnableAdaCompliance);
  const requiresLegalAcknowledgment = !enableAdaCompliance;

  const handleAdaToggle = (event) => {
    const enabled = !!event.target.checked;
    setEnableAdaCompliance(enabled);
    if (enabled) {
      setUnderstood(false);
    }
  };

  const handleClose = () => {
    if (!requiresLegalAcknowledgment || understood) {
      // Mark that user has seen this dialog
      globalThis.localStorage?.setItem('gol-first-load-warning-seen', 'true');
      setUnderstood(false);
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
                <ListItemText sx={{ typography: 'body2' }} primary="Uses low-contrast colors to reduce flash risk" />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 2.5, borderLeft: '4px solid', borderLeftColor: 'primary.main', bgcolor: 'var(--warning-surface)', borderColor: 'var(--warning-border)' }}>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Accessibility Setup
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <input
                type="checkbox"
                checked={enableAdaCompliance}
                onChange={handleAdaToggle}
                id="enable-ada-first-load-checkbox"
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="enable-ada-first-load-checkbox" style={{ margin: 0, cursor: 'pointer', fontSize: '0.95rem' }}>
                ADA Enabled (Recommended)
              </label>
            </Box>
            {enableAdaCompliance ? (
              <Typography variant="body2">
                Current status: ADA protections are ON.
              </Typography>
            ) : (
              <Typography variant="body2">
                {ADA_LEGAL_LIABILITY_NOTICE}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        {/* Two-column layout for Community and Getting Started */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {/* Community & Support Model */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SupportIcon sx={{ color: 'primary.main' }} /> Community Features
            </Typography>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Free to use:</strong> Run simulations, explore patterns, test for photosensitivity safety.
                </Typography>
                
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}>
                  One-Time Lifetime Support Membership ($10):
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
                  1. Support access ($10 one-time lifetime membership):
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
                  Click heart icon → Complete checkout → Confirm email
                </Typography>
                
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  2. Create account:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
                  Click user icon (top right) → Register → Enter email/password
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Need help with this application? Check Help (? icon). For external Conway pattern reference material, visit{' '}
                  <Link href="https://conwaylife.com/wiki/Main_Page" target="_blank" rel="noopener" sx={{ fontSize: 'inherit' }}>
                    LifeWiki
                  </Link>
                  .
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: 'var(--surface-modal)' }}>
        {requiresLegalAcknowledgment ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              id="understand-checkbox"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="understand-checkbox" style={{ margin: 0, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              I acknowledge.
            </label>
          </Box>
        ) : <Box sx={{ flex: 1 }} />}
        <Button onClick={handleClose} disabled={requiresLegalAcknowledgment && !understood} variant="contained" color="primary">
          {enableAdaCompliance ? 'Continue with ADA ON' : 'Continue with ADA OFF'}
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
