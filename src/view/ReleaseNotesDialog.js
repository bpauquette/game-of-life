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
  currentTag: 'game-of-life/v0.1.7',
  previousTag: 'game-of-life/v0.1.6',
  releasedOn: 'February 28, 2026',
  commitItems: [
    '[render-loop] Coalesced controller render scheduling to prevent redundant RAF renders and reduce pointer-interaction stalls (INP improvement).',
    '[shape-loader] Corrected paged shape fetch argument ordering and switched dedupe keys to lightweight shape fingerprints.',
    '[import-shape] Added URL resolution for LifeWiki and GitHub blob inputs, with robust RLE block extraction before backend import.',
    '[import-success] Rewired import success handling to add/select imported shapes and avoid stale no-op callback behavior.',
    '[test-coverage] Added import URL parsing/resolution tests plus dialog integration tests for direct RLE and URL-based import flows.'
  ],
  highlights: [
    'Render request throttling now suppresses duplicate frame work during bursty UI interactions.',
    'Initial shape preload paging now matches backend API contract and reduces client-side dedupe overhead.',
    'Import Shape accepts LifeWiki page URLs, direct RLE URLs, GitHub blob URLs, and pasted RLE text.',
    'Imported shapes immediately appear in recents and become the active shape for placement.',
    'Current automated status: 119/119 suites passing, 505/505 tests passing, 0 skipped.'
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
