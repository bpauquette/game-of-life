import React, { useState } from 'react';

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
    <div className="options-modal-overlay" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="options-modal" role="dialog" aria-modal="true" style={{ background: 'var(--panel-bg, #111)', padding: 16, borderRadius: 8, minWidth: 420, color: 'var(--text, #fff)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Options</h3>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="color-scheme-select" style={{ marginRight: 8 }}>Color Scheme:</label>
          <select
            id="color-scheme-select"
            value={localScheme}
            onChange={(e) => setLocalScheme(e.target.value)}
            title="Choose a rendering color scheme used to draw cells and the background"
          >
            {Object.entries(colorSchemes).map(([key, scheme]) => (
              <option key={key} value={key}>{scheme.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label title="Number of recent generations to consider when deciding if the population is stable">
            Steady window (generations):
            <input
              type="number"
              min={1}
              max={500}
              value={localWindow}
              onChange={(e) => setLocalWindow(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 80, marginLeft: 8 }}
            />
          </label>

          <label title="Maximum allowed change in population over the steady window to consider the world stable">
            Population tolerance:
            <input
              type="number"
              min={0}
              max={1000}
              value={localTolerance}
              onChange={(e) => setLocalTolerance(Math.max(0, Number(e.target.value) || 0))}
              style={{ width: 80, marginLeft: 8 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleCancel}>Cancel</button>
          <button onClick={handleOk}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default OptionsPanel;
