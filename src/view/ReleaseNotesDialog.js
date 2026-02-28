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
  currentTag: 'game-of-life/v0.1.8',
  previousTag: 'game-of-life/v0.1.7',
  releasedOn: 'February 28, 2026',
  commitItems: [
    '[options-panel] Stopped forcing color scheme to BioLife on every save when ADA mode is off, preserving user-selected themes.',
    '[ada-sync] Updated ADA policy propagation to carry explicit color-scheme intent during ADA toggle events instead of defaulting to bio.',
    '[state-ordering] Adjusted options save order so ADA updates only run on actual toggle changes and selected scheme persists reliably.',
    '[test-coverage] Added regression coverage for keeping selected color scheme while ADA mode remains disabled.',
    '[ci-status] Re-ran full build and full Jest suite after the fix.'
  ],
  highlights: [
    'Color scheme selection in Options now persists across save/apply cycles when ADA mode is off.',
    'ADA toggle synchronization no longer resets non-ADA color schemes back to BioLife.',
    'Runtime ADA event handling now respects scheme data from the originating options event.',
    'Regression test added to lock in expected color-scheme persistence behavior.',
    'Current automated status: 119/119 suites passing, 506/506 tests passing, 0 skipped.'
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
