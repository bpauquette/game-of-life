import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const RELEASE_NOTES = {
  currentTag: 'game-of-life/v0.1.6',
  previousTag: 'game-of-life/v0.1.5',
  releasedOn: 'February 27, 2026',
  commitItems: [
    '[regression-fix] Restored generation-zero reset wiring and support-access dialog flows that were overwritten during branch integration.',
    '[ada-ux] Restored first-load ADA dialog copy/controls and re-applied ADA gating for the photosensitivity test action.',
    '[steady-state-tests] Updated UNTIL_STEADY expectations to match confidence-based detector semantics and fixed timeout fixture behavior.',
    '[test-hygiene] Removed obsolete skipped placeholder tests and stale integration stubs.',
    '[ci-status] Verified full Jest suite with no skipped tests and all active tests passing.'
  ],
  highlights: [
    'Generation-zero reset and support-access UI behavior are restored on main.',
    'Photosensitivity test is unavailable when ADA mode is off, and first-load warning dialog behavior matches the legacy UX contract.',
    'UNTIL_STEADY tests now validate confidence-based steady-state detection behavior.',
    'Test suite cleanup removed stale skipped placeholders.',
    'Current automated status: 116/116 suites passing, 495/495 tests passing, 0 skipped.'
  ]
};

export default function ReleaseNotesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Release Notes</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Release tag:</strong> {RELEASE_NOTES.currentTag}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Compared to:</strong> {RELEASE_NOTES.previousTag}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Release date:</strong> {RELEASE_NOTES.releasedOn}
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Commit-by-commit breakdown
        </Typography>
        <Box component="ul" sx={{ pl: 3, mt: 0, mb: 2 }}>
          {RELEASE_NOTES.commitItems.map((item) => (
            <li key={item}>
              <Typography variant="body2">{item}</Typography>
            </li>
          ))}
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          What changed since the last release
        </Typography>
        <Box component="ul" sx={{ pl: 3, mt: 0, mb: 2 }}>
          {RELEASE_NOTES.highlights.map((item) => (
            <li key={item}>
              <Typography variant="body2">{item}</Typography>
            </li>
          ))}
        </Box>

        <Typography variant="body2">
          GitHub tracking uses release tags so changes can be compared by tag range.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

ReleaseNotesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
