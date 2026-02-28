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
  currentTag: 'game-of-life/v0.1.9',
  previousTag: 'game-of-life/v0.1.8',
  releasedOn: 'February 28, 2026',
  commitItems: [
    '[grid-load] Restored load-grid runtime wiring in HeaderBar so selected saved grids are actually applied to the live game state.',
    '[layout-props] Forwarded getLiveCells/onLoadGrid from GameUILayout controlsProps into HeaderBar to remove no-op fallbacks.',
    '[save-load-path] Kept Save/Load dialog behavior while fixing load callback propagation through the header stack.',
    '[test-coverage] Added a HeaderBar regression test that selects a saved grid and verifies onLoadGrid receives loaded liveCells.',
    '[ci-status] Re-ran targeted Jest coverage for HeaderBar save/load and LoadGridDialog integration after the fix.'
  ],
  highlights: [
    'Loading a saved grid from the Load Grid dialog now reliably updates the active simulation again.',
    'HeaderBar now consumes runtime grid callbacks instead of placeholder no-op handlers.',
    'GameUILayout now passes through the grid callbacks required by save/load controls.',
    'Regression coverage now locks in the full HeaderBar load path from selection to runtime callback.',
    'Current automated status: targeted suites passing (`HeaderBar.pauseOnSaveLoad`, `LoadGridDialog.integration`).'
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
