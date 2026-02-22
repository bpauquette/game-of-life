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
  currentTag: 'game-of-life/v0.1.4',
  previousTag: 'game-of-life/v0.1.3',
  releasedOn: 'February 22, 2026',
  commitItems: [
    '[e02e473b] Hardened auth/backend integration plumbing (protected actions, backend API integration paths, and guardrails).',
    '[67e4bd27] Unified controller input handling and added a robust Toggle tool implementation plus coverage.',
    '[cee4b55a] Improved scripting stability analysis and stable-pattern labeling for UNTIL_STEADY behavior.',
    '[b5b83e8d] Refreshed UI/help/dialog flows, toolbar behavior, and release-note surfaces.'
  ],
  highlights: [
    'Fixed Toggle tool click behavior so selecting the mouse tool and clicking a cell always flips live/dead state once per click.',
    'Standardized ADA compliance behavior and legal messaging across the application.',
    'Standardized zoom anchoring: wheel zoom now locks to cursor position and pinch/spread zoom locks to pinch center.',
    'Updated React wheel listeners to non-passive mode so browser scrolling does not override in-canvas zoom behavior.',
    'Added Focus Mode (H) so nonessential UI chrome can be hidden while keeping simulation controls accessible.',
    'Kept the run bar visible in Focus Mode for safer, uninterrupted control while fullscreen testing.',
    'Standardized Focus Mode naming in tooltips and Help text for consistency.',
    'Fixed toolbar layering when Recent Shapes updates so controls are no longer obscured.',
    'Moved Engine mode into Options → Advanced and removed it from the run bar.',
    'Aligned toolbar order with tool shortcut order and in-app help text.',
    'Added reset-to-generation-zero and plain-language HashLife guidance in Help.',
    'Standardized Life Lexicon attribution wording and links.',
    'Standardized privacy policy support and dialog access from About/account flows.',
    'Refreshed help content to match current behavior and controls.'
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
