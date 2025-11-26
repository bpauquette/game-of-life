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
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { Info as InfoIcon } from '@mui/icons-material';

const OptionsPanel = ({
  // ...existing props...
  setConfirmOnClear,
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
  enableFPSCap = false,
  setEnableFPSCap,
  enableGPSCap = false,
  setEnableGPSCap,
  // UX settings
  confirmOnClear = true,
  maxChartGenerations = 5000,
  setMaxChartGenerations,
  detectStablePopulation = false,
  setDetectStablePopulation,
  memoryTelemetryEnabled = false,
  setMemoryTelemetryEnabled,
  // Random rectangle fill percent (0-100)
  randomRectPercent = 50,
  setRandomRectPercent,
  onOk,
  onCancel
}) => {
  const [localScheme, setLocalScheme] = useState(colorSchemeKey || 'bio');
  const [localWindow, setLocalWindow] = useState(popWindowSize);
  const [localTolerance, setLocalTolerance] = useState(popTolerance);
  const [localShowSpeedGauge, setLocalShowSpeedGauge] = useState(showSpeedGauge);
  const [localMaxFPS, setLocalMaxFPS] = useState(maxFPS);
  const [localMaxGPS, setLocalMaxGPS] = useState(maxGPS);
  const [localEnableFPSCap, setLocalEnableFPSCap] = useState(enableFPSCap);
  const [localEnableGPSCap, setLocalEnableGPSCap] = useState(enableGPSCap);
  const [localConfirmOnClear, setLocalConfirmOnClear] = useState(confirmOnClear);
  const [localDrawToggleMode, setLocalDrawToggleMode] = useState(false); // default to off
  const [localDrawWhileRunning, setLocalDrawWhileRunning] = useState(() => {
    try {
      const v = globalThis.localStorage.getItem('drawWhileRunning');
      if (v != null) return JSON.parse(v);
      // Default draw-while-running to true per user request
      return true;
    } catch {
      return true;
    }
  });
  const [localDetectStablePopulation, setLocalDetectStablePopulation] = useState(detectStablePopulation);
    const [localMaxChartGenerations, setLocalMaxChartGenerations] = useState(maxChartGenerations);
  const [localMemoryTelemetryEnabled, setLocalMemoryTelemetryEnabled] = useState(() => {
    try {
      const stored = globalThis.localStorage.getItem('memoryTelemetryEnabled');
      if (stored === 'true' || stored === 'false') return stored === 'true';
    } catch {}
    return memoryTelemetryEnabled;
  });
  const [localRandomRectPercent, setLocalRandomRectPercent] = useState(() => {
    try {
      const stored = globalThis.localStorage.getItem('randomRectPercent');
      if (stored != null) {
        const s = Number.parseInt(stored, 10);
        if (!Number.isNaN(s)) return Math.max(0, Math.min(100, s));
      }
    } catch (e) {
      // ignore
    }
    const n = Number(randomRectPercent);
    if (!Number.isFinite(n)) return 50;
    return Math.max(0, Math.min(100, Math.round(n)));
  });

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
    try { setEnableFPSCap?.(!!localEnableFPSCap); } catch (err) { logger.debug('setEnableFPSCap failed:', err); }
    try { setEnableGPSCap?.(!!localEnableGPSCap); } catch (err) { logger.debug('setEnableGPSCap failed:', err); }
    try { setConfirmOnClear?.(!!localConfirmOnClear); } catch (err) { logger.debug('setConfirmOnClear failed:', err); }
    try { setMaxChartGenerations?.(Number(localMaxChartGenerations) || 5000); } catch (err) { logger.debug('setMaxChartGenerations failed:', err); }
    try { setRandomRectPercent?.(Math.max(0, Math.min(100, Number(localRandomRectPercent)))); } catch (err) { logger.debug('setRandomRectPercent failed:', err); }
  // Persist all options so they are remembered across sessions
  try { globalThis.localStorage.setItem('colorSchemeKey', String(localScheme)); } catch {}
  try { globalThis.localStorage.setItem('popWindowSize', String(win)); } catch {}
  try { globalThis.localStorage.setItem('popTolerance', String(tol)); } catch {}
  try { globalThis.localStorage.setItem('showSpeedGauge', JSON.stringify(!!localShowSpeedGauge)); } catch {}
  try { globalThis.localStorage.setItem('maxFPS', String(localMaxFPS)); } catch {}
  try { globalThis.localStorage.setItem('maxGPS', String(localMaxGPS)); } catch {}
  try { globalThis.localStorage.setItem('enableFPSCap', JSON.stringify(!!localEnableFPSCap)); } catch {}
  try { globalThis.localStorage.setItem('enableGPSCap', JSON.stringify(!!localEnableGPSCap)); } catch {}
  try { globalThis.localStorage.setItem('confirmOnClear', JSON.stringify(!!localConfirmOnClear)); } catch {}
  try { globalThis.localStorage.setItem('maxChartGenerations', String(localMaxChartGenerations)); } catch {}
  try { globalThis.localStorage.setItem('detectStablePopulation', JSON.stringify(!!localDetectStablePopulation)); } catch {}
  try { globalThis.localStorage.setItem('drawToggleMode', JSON.stringify(localDrawToggleMode)); } catch {}
  try { globalThis.localStorage.setItem('randomRectPercent', String(Math.max(0, Math.min(100, Number(localRandomRectPercent))))); } catch {}
  try { globalThis.localStorage.setItem('drawWhileRunning', JSON.stringify(localDrawWhileRunning)); } catch {}
  try { setDetectStablePopulation?.(!!localDetectStablePopulation); } catch {}
  try {
    setMemoryTelemetryEnabled?.(!!localMemoryTelemetryEnabled);
    globalThis.localStorage.setItem('memoryTelemetryEnabled', (!!localMemoryTelemetryEnabled) ? 'true' : 'false');
  } catch {}
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

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!localEnableFPSCap}
                  onChange={(e) => setLocalEnableFPSCap(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="enable-fps-cap-checkbox"
                />
                <label htmlFor="enable-fps-cap-checkbox" style={{ margin: 0 }}>
                  Enable FPS cap
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!localEnableGPSCap}
                  onChange={(e) => setLocalEnableGPSCap(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="enable-gps-cap-checkbox"
                />
                <label htmlFor="enable-gps-cap-checkbox" style={{ margin: 0 }}>
                  Enable GPS cap
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

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16 }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Interaction</h4>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!localConfirmOnClear}
                onChange={(e) => setLocalConfirmOnClear(e.target.checked)}
                style={{ marginRight: 8 }}
                id="confirm-on-clear-checkbox"
              />
              <label htmlFor="confirm-on-clear-checkbox" style={{ margin: 0 }}>
                Confirm before clearing grid
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={!!localDrawWhileRunning}
                onChange={(e) => setLocalDrawWhileRunning(e.target.checked)}
                style={{ marginRight: 8 }}
                id="draw-while-running-checkbox"
              />
              <label htmlFor="draw-while-running-checkbox" style={{ margin: 0 }}>
                Draw while running
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!localDrawToggleMode}
                onChange={(e) => setLocalDrawToggleMode(!e.target.checked)}
                style={{ marginRight: 8 }}
                id="toggle-draw-mode-checkbox"
              />
              <label htmlFor="toggle-draw-mode-checkbox" style={{ margin: 0 }}>
                Toggle Draw Mode
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={!!localDetectStablePopulation}
                onChange={(e) => setLocalDetectStablePopulation(e.target.checked)}
                style={{ marginRight: 8 }}
                id="detect-stable-population-checkbox"
              />
              <label htmlFor="detect-stable-population-checkbox" style={{ margin: 0 }}>
                Detect Stable Population
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={!!localMemoryTelemetryEnabled}
                onChange={(e) => setLocalMemoryTelemetryEnabled(e.target.checked)}
                style={{ marginRight: 8 }}
                id="memory-telemetry-enabled-checkbox"
              />
              <label htmlFor="memory-telemetry-enabled-checkbox" style={{ margin: 0 }}>
                Enable memory telemetry (experimental)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <label htmlFor="max-chart-generations-input" style={{ marginRight: 8 }}>
                Max generations in chart
              </label>
              <input
                id="max-chart-generations-input"
                type="number"
                min={100}
                max={20000}
                value={localMaxChartGenerations}
                onChange={(e) => setLocalMaxChartGenerations(e.target.value)}
                style={{ width: 96 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">Random rectangle fill (%)</Typography>
                <Typography variant="caption" color="text.secondary">0 = all off, 100 = all on</Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Slider
                  value={localRandomRectPercent}
                  onChange={(e, v) => setLocalRandomRectPercent(Number(v))}
                  aria-labelledby="random-rect-percent-input"
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                  sx={{ flex: 1 }}
                />
                <input
                  id="random-rect-percent-input"
                  type="number"
                  min={0}
                  max={100}
                  value={localRandomRectPercent}
                  onChange={(e) => {
                    let v = Number.parseInt(e.target.value, 10);
                    if (Number.isNaN(v)) v = 50;
                    if (v < 0) v = 0;
                    if (v > 100) v = 100;
                    setLocalRandomRectPercent(v);
                  }}
                  style={{ width: 72 }}
                />
              </div>
            </div>
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
  confirmOnClear: PropTypes.bool,
  // setConfirmOnClear: PropTypes.func, // Removed duplicate
  detectStablePopulation: PropTypes.bool,
  setDetectStablePopulation: PropTypes.func,
  memoryTelemetryEnabled: PropTypes.bool,
  setMemoryTelemetryEnabled: PropTypes.func,
  randomRectPercent: PropTypes.number,
  setRandomRectPercent: PropTypes.func,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default OptionsPanel;
