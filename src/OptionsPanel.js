import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import InfoIcon from '@mui/icons-material/Info';

const OptionsPanel = ({
  colorSchemes,
  colorSchemeKey,
  setColorSchemeKey,
  popWindowSize,
  setPopWindowSize,
  popTolerance,
  setPopTolerance,
  onOk,
  onCancel
}) => {
  const [localScheme, setLocalScheme] = useState(colorSchemeKey);
  const [localWindow, setLocalWindow] = useState(popWindowSize);
  const [localTolerance, setLocalTolerance] = useState(popTolerance);

  const handleOk = () => {
    try { setColorSchemeKey(localScheme); } catch (err) {}
    try { setPopWindowSize(Math.max(1, Number(localWindow) || 1)); } catch (err) {}
    try { setPopTolerance(Math.max(0, Number(localTolerance) || 0)); } catch (err) {}
    if (typeof onOk === 'function') onOk();
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') onCancel();
  };

  return (
    <Dialog open onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Options</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Color scheme"
            value={localScheme}
            onChange={(e) => setLocalScheme(e.target.value)}
            helperText="Choose a rendering color scheme"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Choose the renderer color scheme used for cells and grid.">
                    <InfoIcon fontSize="small" />
                  </Tooltip>
                </InputAdornment>
              )
            }}
          >
            {Object.entries(colorSchemes).map(([key, scheme]) => (
              <MenuItem key={key} value={key}>{scheme.name}</MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Steady window (generations)"
              type="number"
              size="small"
              value={localWindow}
              onChange={(e) => setLocalWindow(Math.max(1, Number(e.target.value) || 1))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Number of past generations used to evaluate population stability.">
                      <InfoIcon fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Population tolerance"
              type="number"
              size="small"
              value={localTolerance}
              onChange={(e) => setLocalTolerance(Math.max(0, Number(e.target.value) || 0))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Allowed change in population count over the window before we consider it stable.">
                      <InfoIcon fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleOk} variant="contained">OK</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OptionsPanel;
