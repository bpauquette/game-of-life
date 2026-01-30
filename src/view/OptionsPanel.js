import React, { useState } from 'react';
import PropTypes from 'prop-types';
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
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from './context/ThemeContext.js';

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
  useWebWorker = false,
  setUseWebWorker,
  // UX settings
  confirmOnClear = true,
  maxChartGenerations = 5000,
  setMaxChartGenerations,
  detectStablePopulation = true,
  setDetectStablePopulation,
  memoryTelemetryEnabled = false,
  setMemoryTelemetryEnabled,
  photosensitivityTesterEnabled = false,
  setPhotosensitivityTesterEnabled,
  // Random rectangle fill percent (0-100)
  randomRectPercent = 50,
  setRandomRectPercent,
  // ADA compliance settings
  enableAdaCompliance = true,
  setEnableAdaCompliance,

  backendType = 'node',
  setBackendType,
  onOk,
  onCancel
}) => {
  const [localScheme, setLocalScheme] = useState(colorSchemeKey || 'bio');
  const [localBackendType, setLocalBackendType] = useState(() => {
  const stored = globalThis.localStorage.getItem('backendType');
  if (stored === 'node' || stored === 'java') return stored;
  return backendType || 'node';
  });
  const [localWindow, setLocalWindow] = useState(popWindowSize);
  const [localTolerance, setLocalTolerance] = useState(popTolerance);
  const [localShowSpeedGauge, setLocalShowSpeedGauge] = useState(showSpeedGauge);
  const [localMaxFPS, setLocalMaxFPS] = useState(maxFPS);
  const [localMaxGPS, setLocalMaxGPS] = useState(maxGPS);
  const [localEnableFPSCap, setLocalEnableFPSCap] = useState(enableFPSCap);
  const [localEnableGPSCap, setLocalEnableGPSCap] = useState(enableGPSCap);
  const [localUseWebWorker, setLocalUseWebWorker] = useState(useWebWorker);
  const [localConfirmOnClear, setLocalConfirmOnClear] = useState(confirmOnClear);
  const [localDrawToggleMode, setLocalDrawToggleMode] = useState(false); // default to off
  const [localDrawWhileRunning, setLocalDrawWhileRunning] = useState(() => {
  const v = globalThis.localStorage.getItem('drawWhileRunning');
  if (v != null) return JSON.parse(v);
  // Default draw-while-running to true per user request
  return true;
});
  const [localDetectStablePopulation, setLocalDetectStablePopulation] = useState(detectStablePopulation);
    const [localMaxChartGenerations, setLocalMaxChartGenerations] = useState(maxChartGenerations);
  const [localMemoryTelemetryEnabled, setLocalMemoryTelemetryEnabled] = useState(() => {
  const stored = globalThis.localStorage.getItem('memoryTelemetryEnabled');
  if (stored === 'true' || stored === 'false') return stored === 'true';
  return memoryTelemetryEnabled;
});
  const [localPhotosensitivityTesterEnabled, setLocalPhotosensitivityTesterEnabled] = useState(() => {
  const stored = globalThis.localStorage.getItem('photosensitivityTesterEnabled');
  if (stored === 'true' || stored === 'false') return stored === 'true';
  return photosensitivityTesterEnabled;
});
  const [localRandomRectPercent, setLocalRandomRectPercent] = useState(() => {
  const stored = globalThis.localStorage.getItem('randomRectPercent');
  if (stored != null) {
    const s = Number.parseInt(stored, 10);
    if (!Number.isNaN(s)) return Math.max(0, Math.min(100, s));
  }
  const n = Number(randomRectPercent);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
});
  const [localEnableAdaCompliance, setLocalEnableAdaCompliance] = useState(() => {
  const stored = globalThis.localStorage.getItem('enableAdaCompliance');
  if (stored === 'true' || stored === 'false') return stored === 'true';
  if (stored != null) return Boolean(JSON.parse(stored));
  return enableAdaCompliance;
});

  // Theme selection
  const { themeMode, setThemeMode, availableThemes } = useTheme();
  const [localThemeMode, setLocalThemeMode] = useState(themeMode);


  const prevAda = (() => {
  const stored = globalThis.localStorage.getItem('enableAdaCompliance');
  if (stored === 'true' || stored === 'false') return stored === 'true';
  if (stored != null) return Boolean(JSON.parse(stored));
  return enableAdaCompliance;
})();

  const handleOk = () => {
  setColorSchemeKey(localScheme);
  setBackendType?.(localBackendType);
  globalThis.localStorage.setItem('backendType', localBackendType);
  // Apply theme change
  setThemeMode(localThemeMode);
  // Clamp and default globalThis size
  let win = Number.parseInt(localWindow, 10);
  if (Number.isNaN(win) || win < 1) win = 1;
  setPopWindowSize(win);
  // Clamp and default tolerance
  let tol = Number.parseInt(localTolerance, 10);
  if (Number.isNaN(tol) || tol < 0) tol = 0;
  setPopTolerance(tol);
  setShowSpeedGauge?.(localShowSpeedGauge);
  // If ADA compliance is on, force maxFPS to 2 and enable FPS cap
  const finalMaxFPS = localEnableAdaCompliance ? 2 : Math.max(1, Math.min(120, Number(localMaxFPS) || 60));
  const finalMaxGPS = localEnableAdaCompliance ? 2 : Math.max(1, Math.min(60, Number(localMaxGPS) || 30));
  setMaxFPS?.(finalMaxFPS);
  setMaxGPS?.(finalMaxGPS);
  // When ADA compliance is on, always enable FPS/GPS caps
  const finalEnableFPSCap = localEnableAdaCompliance ? true : !!localEnableFPSCap;
  const finalEnableGPSCap = localEnableAdaCompliance ? true : !!localEnableGPSCap;
  setEnableFPSCap?.(finalEnableFPSCap);
  setEnableGPSCap?.(finalEnableGPSCap);
  setUseWebWorker?.(!!localUseWebWorker);
  setConfirmOnClear?.(!!localConfirmOnClear);
  setMaxChartGenerations?.(Number(localMaxChartGenerations) || 5000);
  setRandomRectPercent?.(Math.max(0, Math.min(100, Number(localRandomRectPercent))));
  setEnableAdaCompliance?.(!!localEnableAdaCompliance);
  setPhotosensitivityTesterEnabled?.(!!localPhotosensitivityTesterEnabled);
  // Persist all options so they are remembered across sessions
  globalThis.localStorage.setItem('colorSchemeKey', String(localScheme));
  globalThis.localStorage.setItem('popWindowSize', String(win));
  globalThis.localStorage.setItem('popTolerance', String(tol));
  globalThis.localStorage.setItem('showSpeedGauge', JSON.stringify(!!localShowSpeedGauge));
  globalThis.localStorage.setItem('maxFPS', String(finalMaxFPS));
  globalThis.localStorage.setItem('maxGPS', String(finalMaxGPS));
  globalThis.localStorage.setItem('enableFPSCap', JSON.stringify(finalEnableFPSCap));
  globalThis.localStorage.setItem('enableGPSCap', JSON.stringify(finalEnableGPSCap));
  globalThis.localStorage.setItem('useWebWorker', JSON.stringify(!!localUseWebWorker));
  globalThis.localStorage.setItem('confirmOnClear', JSON.stringify(!!localConfirmOnClear));
  globalThis.localStorage.setItem('maxChartGenerations', String(localMaxChartGenerations));
  globalThis.localStorage.setItem('detectStablePopulation', JSON.stringify(!!localDetectStablePopulation));
  globalThis.localStorage.setItem('drawToggleMode', JSON.stringify(localDrawToggleMode));
  globalThis.localStorage.setItem('randomRectPercent', String(Math.max(0, Math.min(100, Number(localRandomRectPercent)))));
  globalThis.localStorage.setItem('enableAdaCompliance', JSON.stringify(!!localEnableAdaCompliance));
  globalThis.localStorage.setItem('photosensitivityTesterEnabled', JSON.stringify(!!localPhotosensitivityTesterEnabled));
  globalThis.localStorage.setItem('drawWhileRunning', JSON.stringify(localDrawWhileRunning));
  setDetectStablePopulation?.(!!localDetectStablePopulation);
  setMemoryTelemetryEnabled?.(!!localMemoryTelemetryEnabled);
  globalThis.localStorage.setItem('memoryTelemetryEnabled', localMemoryTelemetryEnabled ? 'true' : 'false');

  // Dispatch global event if ADA compliance changed
  if (prevAda !== !!localEnableAdaCompliance) {
    globalThis.dispatchEvent(new CustomEvent('gol:adaChanged', { detail: { enabled: !!localEnableAdaCompliance } }));
  }
  onOk?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Dialog open onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Options</DialogTitle>
      <DialogContent>
        {/* Options content here */}
        <TextField
                  select
                  label="Backend"
                  value={localBackendType}
                  onChange={e => setLocalBackendType(e.target.value)}
                  helperText="Switch between Node (port 55000) and Java (port 55001) backends"
                  size="small"
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="node">Node (port 55000)</MenuItem>
                  <MenuItem value="java">Java (port 55001)</MenuItem>
                </TextField>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* App Theme Selector */}
          <TextField
            select
            label="App theme"
            value={localThemeMode}
            onChange={(e) => setLocalThemeMode(e.target.value)}
            helperText="Choose the overall app appearance"
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Switch between light, dark, high contrast, and OLED themes.">
                      <InfoIcon fontSize="small" />
                    </Tooltip>
                  </InputAdornment>
                )
              }
            }}
          >
            {availableThemes.map((theme) => (
              <MenuItem key={theme.id} value={theme.id}>{theme.label}</MenuItem>
            ))}
          </TextField>

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
              label="Steady globalThis (generations)"
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
                      <Tooltip title="Allowed change in population count over the globalThis before we consider it stable.">
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

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Accessibility & Compliance</h2>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>ADA Compliance Mode</strong> (default: ON) restricts animation and simulation speed to 2 FPS/GPS maximum to comply with WCAG 2.1 photosensitivity guidelines and reduce seizure risk for users with photosensitive epilepsy.
              </Typography>
            </Alert>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={!!localEnableAdaCompliance}
                onChange={(e) => setLocalEnableAdaCompliance(e.target.checked)}
                style={{ marginRight: 8 }}
                id="enable-ada-compliance-checkbox"
              />
              <label htmlFor="enable-ada-compliance-checkbox" style={{ margin: 0, fontWeight: 'bold' }}>
                Enable ADA Compliance Mode
              </label>
              <Tooltip title="When enabled, animation and simulation are capped at 2 FPS/GPS for photosensitivity safety. When disabled, you assume legal liability.">
                <InfoIcon fontSize="small" style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </Tooltip>
            </div>

            {!localEnableAdaCompliance && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>⚠️ WARNING: LEGAL LIABILITY NOTICE</strong><br />
                  You have disabled ADA compliance mode. By continuing, you acknowledge and accept full legal responsibility for any harm caused by photosensitive seizures or other adverse health effects resulting from the animation speed. This software is provided as-is, and the copyright holders, developers, and distributors disclaim all liability for injuries, damages, or claims arising from your choice to operate outside compliance standards. Photosensitive individuals, particularly those with epilepsy, may experience seizures triggered by visual stimuli at frequencies above 2 Hz. You are legally liable if your use of this non-compliant setting causes injury.
                </Typography>
              </Alert>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={localEnableAdaCompliance && !!localPhotosensitivityTesterEnabled}
                onChange={(e) => localEnableAdaCompliance && setLocalPhotosensitivityTesterEnabled(e.target.checked)}
                disabled={!localEnableAdaCompliance}
                style={{ marginRight: 8 }}
                id="enable-photosensitivity-tester-checkbox"
              />
              <label htmlFor="enable-photosensitivity-tester-checkbox" style={{ margin: 0, opacity: localEnableAdaCompliance ? 1 : 0.5 }}>
                Enable photosensitivity tester (manual)
              </label>
              <Tooltip title={localEnableAdaCompliance ? "Expose the manual photosensitivity tester dialog. Available only in ADA Compliance Mode." : "Only available when ADA Compliance Mode is enabled"}>
                <InfoIcon fontSize="small" style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </Tooltip>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Performance Settings</h2>
            
            <Stack spacing={2}>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={localEnableAdaCompliance ? true : !!localEnableFPSCap}
                  onChange={(e) => !localEnableAdaCompliance && setLocalEnableFPSCap(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="enable-fps-cap-checkbox"
                  disabled={localEnableAdaCompliance}
                />
                <label htmlFor="enable-fps-cap-checkbox" style={{ margin: 0 }}>
                  Enable FPS cap
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={localEnableAdaCompliance ? true : !!localEnableGPSCap}
                  onChange={(e) => !localEnableAdaCompliance && setLocalEnableGPSCap(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="enable-gps-cap-checkbox"
                  disabled={localEnableAdaCompliance}
                />
                <label htmlFor="enable-gps-cap-checkbox" style={{ margin: 0 }}>
                  Enable GPS cap
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={!!localUseWebWorker}
                  onChange={(e) => setLocalUseWebWorker(e.target.checked)}
                  style={{ marginRight: 8 }}
                  id="use-web-worker-checkbox"
                />
                <label htmlFor="use-web-worker-checkbox" style={{ margin: 0 }}>
                  Use Web Worker
                </label>
                <Tooltip title="Run simulation in a background thread to keep it running when the tab is not active.">
                  <InfoIcon fontSize="small" style={{ marginLeft: '4px', cursor: 'pointer' }} />
                </Tooltip>
              </div>

              <Stack spacing={2}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      Max FPS: {localEnableAdaCompliance ? 2 : localMaxFPS}
                    </label>
                    <Tooltip title={localEnableAdaCompliance ? "Locked: ADA Compliance Mode restricts to 2 FPS" : "Maximum frames per second for rendering"}>
                      <InfoIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} />
                    </Tooltip>
                  </div>
                  <Slider
                    value={localEnableAdaCompliance ? 2 : Number(localMaxFPS) || 120}
                    onChange={(e, val) => !localEnableAdaCompliance && setLocalMaxFPS(val)}
                    disabled={localEnableAdaCompliance}
                    min={1}
                    max={120}
                    step={1}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 1, label: '1' },
                      { value: 60, label: '60' },
                      { value: 120, label: '120' }
                    ]}
                    sx={{ color: localEnableAdaCompliance ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}
                  />
                  {localEnableAdaCompliance && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', marginTop: 1 }}>
                      Fixed at 2 FPS for ADA compliance
                    </Typography>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      Max GPS: {localEnableAdaCompliance ? 2 : localMaxGPS}
                    </label>
                    <Tooltip title={localEnableAdaCompliance ? "Locked: ADA Compliance Mode restricts to 2 GPS" : "Maximum generations per second for simulation"}>
                      <InfoIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} />
                    </Tooltip>
                  </div>
                  <Slider
                    value={localEnableAdaCompliance ? 2 : Number(localMaxGPS) || 60}
                    onChange={(e, val) => !localEnableAdaCompliance && setLocalMaxGPS(val)}
                    disabled={localEnableAdaCompliance}
                    min={1}
                    max={60}
                    step={1}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 1, label: '1' },
                      { value: 30, label: '30' },
                      { value: 60, label: '60' }
                    ]}
                    sx={{ color: localEnableAdaCompliance ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}
                  />
                  {localEnableAdaCompliance && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', marginTop: 1 }}>
                      Fixed at 2 GPS for ADA compliance
                    </Typography>
                  )}
                </div>
              </Stack>
            </Stack>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Interaction</h2>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, color: 'var(--text-primary)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, color: 'var(--text-primary)' }}>
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
                  onChange={(e, v) => {
                    const clamped = Math.max(0, Math.min(100, Number(v)));
                    setLocalRandomRectPercent(clamped);
                    setRandomRectPercent?.(clamped);
                  }}
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
                    setRandomRectPercent?.(v);
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
    backendType: PropTypes.string,
    setBackendType: PropTypes.func,
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
  useWebWorker: PropTypes.bool,
  setUseWebWorker: PropTypes.func,
  confirmOnClear: PropTypes.bool,
  detectStablePopulation: PropTypes.bool,
  setDetectStablePopulation: PropTypes.func,
  memoryTelemetryEnabled: PropTypes.bool,
  setMemoryTelemetryEnabled: PropTypes.func,
  photosensitivityTesterEnabled: PropTypes.bool,
  setPhotosensitivityTesterEnabled: PropTypes.func,
  randomRectPercent: PropTypes.number,
  setRandomRectPercent: PropTypes.func,
  enableAdaCompliance: PropTypes.bool,
  setEnableAdaCompliance: PropTypes.func,
      setConfirmOnClear: PropTypes.func,
      enableFPSCap: PropTypes.bool,
      setEnableFPSCap: PropTypes.func,
      enableGPSCap: PropTypes.bool,
      setEnableGPSCap: PropTypes.func,
      maxChartGenerations: PropTypes.number,
      setMaxChartGenerations: PropTypes.func,

  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default OptionsPanel;
