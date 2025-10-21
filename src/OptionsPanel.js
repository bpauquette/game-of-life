import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import logger from './utils/logger';
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
  useOptimizedRenderer,
  setUseOptimizedRenderer,
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
  const [localUseOptimizedRenderer, setLocalUseOptimizedRenderer] = useState(useOptimizedRenderer);
  const [localMaxFPS, setLocalMaxFPS] = useState(maxFPS);
  const [localMaxGPS, setLocalMaxGPS] = useState(maxGPS);

  const handleOk = () => {
    try { setColorSchemeKey(localScheme); } catch (err) { logger.debug('setColorSchemeKey failed:', err); }
    try { setPopWindowSize(Math.max(1, Number(localWindow) || 1)); } catch (err) { logger.debug('setPopWindowSize failed:', err); }
    try { setPopTolerance(Math.max(0, Number(localTolerance) || 0)); } catch (err) { logger.debug('setPopTolerance failed:', err); }
    try { setShowSpeedGauge?.(localShowSpeedGauge); } catch (err) { logger.debug('setShowSpeedGauge failed:', err); }
    try { setUseOptimizedRenderer?.(localUseOptimizedRenderer); } catch (err) { logger.debug('setUseOptimizedRenderer failed:', err); }
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
          
          {/* Performance Settings */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16 }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Performance Settings</h4>
            
            <Stack spacing={2}>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={localShowSpeedGauge}
                    onChange={(e) => setLocalShowSpeedGauge(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Show Speed Gauge
                </label>
              </div>
              
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={localUseOptimizedRenderer}
                    onChange={(e) => setLocalUseOptimizedRenderer(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Use Optimized Renderer (recommended)
                </label>
              </div>
              
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Max FPS"
                  type="number"
                  size="small"
                  value={localMaxFPS}
                  onChange={(e) => setLocalMaxFPS(Math.max(1, Math.min(120, Number(e.target.value) || 60)))}
                  inputProps={{ min: 1, max: 120 }}
                  helperText="1-120"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Maximum frames per second for rendering">
                          <InfoIcon fontSize="small" />
                        </Tooltip>
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  label="Max Gen/Sec"
                  type="number"
                  size="small"
                  value={localMaxGPS}
                  onChange={(e) => setLocalMaxGPS(Math.max(1, Math.min(60, Number(e.target.value) || 30)))}
                  inputProps={{ min: 1, max: 60 }}
                  helperText="1-60"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Maximum generations per second for game logic">
                          <InfoIcon fontSize="small" />
                        </Tooltip>
                      </InputAdornment>
                    )
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
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default OptionsPanel;
