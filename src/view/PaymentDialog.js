import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// Simple donation dialog offering multiple external donation options.
// URLs are intentionally generic; replace with the project's real links.
export default function PaymentDialog({ open, onClose }) {
  // Canonical project URLs — update to match repository/location
  const repoUrl = 'https://github.com/bpauquette/game-of-life';
  const issuesUrl = repoUrl + '/issues/new/choose';

  // Keep frontend links minimal to avoid exposing donation targets.
  const links = [
    { label: 'Project (GitHub)', url: repoUrl },
    { label: 'Report a bug / Request a feature', url: issuesUrl }
  ];

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Support the Project</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          If you enjoy this app and would like to support its continued development,
          please consider donating. Any contribution helps cover hosting, development time,
          and tooling costs.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button href="/donate" variant="contained" color="primary">Donate</Button>
          {links.map((l) => (
            <Button key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" variant="outlined">
              {l.label}
            </Button>
          ))}
        </Box>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">Project repo:</Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{repoUrl}</Typography>
          <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(repoUrl); } catch (e) { /* ignore */ } }}>Copy</Button>
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Prefer not to use a payment provider? You can also contribute code, documentation,
          bug reports, or share the project with others — all are appreciated.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

PaymentDialog.defaultProps = { open: false, onClose: () => {} };
