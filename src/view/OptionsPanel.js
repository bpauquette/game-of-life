import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import logger from '../controller/utils/logger';
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
  // Performance settings
  showSpeedGauge,
  setShowSpeedGauge,
  maxFPS,
  setMaxFPS,
  maxGPS,
  setMaxGPS,
  onOk,
  onCancel
}) => {
  const [localScheme, setLocalScheme] = useState(colorSchemeKey);
  const [localWindow, setLocalWindow] = useState(popWindowSize);
  const [localTolerance, setLocalTolerance] = useState(popTolerance);
  const [localShowSpeedGauge, setLocalShowSpeedGauge] = useState(showSpeedGauge);
  const [localMaxFPS, setLocalMaxFPS] = useState(maxFPS);
  const [localMaxGPS, setLocalMaxGPS] = useState(maxGPS);

  const handleOk = () => {
  try { setColorSchemeKey(localScheme); } catch (err) { logger.debug('setColorSchemeKey failed:', err); }
  // Clamp and default window size
  let win = Number.parseInt(localWindow, 10);
  if (Number.isNaN(win) || win < 1) win = 1;
  try { setPopWindowSize(win); } catch (err) { logger.debug('setPopWindowSize failed:', err); }
  // Clamp and default tolerance
  let tol = Number.parseInt(localTolerance, 10);
  if (Number.isNaN(tol) || tol < 0) tol = 0;
  try { setPopTolerance(tol); } catch (err) { logger.debug('setPopTolerance failed:', err); }
    try { setShowSpeedGauge?.(localShowSpeedGauge); } catch (err) { logger.debug('setShowSpeedGauge failed:', err); }
    try { setMaxFPS?.(Math.max(1, Math.min(120, Number(localMaxFPS) || 60))); } catch (err) { logger.debug('setMaxFPS failed:', err); }
    try { setMaxGPS?.(Math.max(1, Math.min(60, Number(localMaxGPS) || 30))); } catch (err) { logger.debug('setMaxGPS failed:', err); }
    onOk?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Dialog open onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Options</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Color scheme"
            // Fallback to empty string when the current scheme is not present
            value={Object.hasOwn(colorSchemes, localScheme) ? localScheme : ''}
            onChange={(e) => setLocalScheme(e.target.value)}
            helperText="Choose a rendering color scheme"
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Choose the renderer color scheme used for cells and grid.">
                      <InfoIcon fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                )
              }
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
              value={(() => { 
                const v = Number.parseInt(localWindow, 10);
                if (Number.isNaN(v) || v < 1) return 1;
                return v;
              })()}
              onChange={e => {
                let v = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(v) || v < 1) v = 1;
                setLocalWindow(v);
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Number of past generations used to evaluate population stability.">
                        <InfoIcon fontSize="small" />
                      </Tooltip>
                    </InputAdornment>
                  )
                },
                htmlInput: {
                  min: 1
                }
              }}
            />
            <TextField
              label="Population tolerance"
              type="number"
              size="small"
              value={(() => { 
                const v = Number.parseInt(localTolerance, 10);
                if (Number.isNaN(v) || v < 0) return 0;
                return v;
              })()}
              onChange={e => {
                let v = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(v) || v < 0) v = 0;
                setLocalTolerance(v);
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Allowed change in population count over the window before we consider it stable.">
                        <InfoIcon fontSize="small" />
                      </Tooltip>
                    </InputAdornment>
                  )
                },
                htmlInput: {
                  min: 0
                }
              }}
            />
          </Stack>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16 }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Performance Settings</h4>
            
            <Stack spacing={2}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={localShowSpeedGauge}
                  onChange={(e) => setLocalShowSpeedGauge(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="show-speed-gauge-checkbox"
                />
                <label htmlFor="show-speed-gauge-checkbox" style={{ margin: 0 }}>
                  Show Speed Gauge
                </label>
              </div>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Max FPS"
                  type="number"
                  size="small"
                  value={localMaxFPS}
                  onChange={e => setLocalMaxFPS(e.target.value)}
                  helperText="1-120"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Maximum frames per second for rendering">
                            <InfoIcon fontSize="small" />
                          </Tooltip>
                        </InputAdornment>
                      )
                    },
                    htmlInput: {
                      min: 1,
                      max: 120
                    }
                  }}
                />
                <TextField
                  label="Max GPS"
                  type="number"
                  size="small"
                  value={localMaxGPS}
                  onChange={e => setLocalMaxGPS(e.target.value)}
                  helperText="1-60"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Maximum generations per second for game logic">
                            <InfoIcon fontSize="small" />
                          </Tooltip>
                        </InputAdornment>
                      )
                    },
                    htmlInput: {
                      min: 1,
                      max: 60
                    }
                  }}
                />
              </Stack>
            </Stack>
          </div>
        
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleOk} variant="contained">OK</Button>
      </DialogActions>
    </Dialog>
  );
};

OptionsPanel.propTypes = {
  colorSchemes: PropTypes.object.isRequired,
  colorSchemeKey: PropTypes.string.isRequired,
  setColorSchemeKey: PropTypes.func.isRequired,
  popWindowSize: PropTypes.number.isRequired,
  setPopWindowSize: PropTypes.func.isRequired,
  popTolerance: PropTypes.number.isRequired,
  setPopTolerance: PropTypes.func.isRequired,
  showSpeedGauge: PropTypes.bool.isRequired,
  setShowSpeedGauge: PropTypes.func.isRequired,
  maxFPS: PropTypes.number.isRequired,
  setMaxFPS: PropTypes.func.isRequired,
  maxGPS: PropTypes.number.isRequired,
  setMaxGPS: PropTypes.func.isRequired,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default OptionsPanel;
