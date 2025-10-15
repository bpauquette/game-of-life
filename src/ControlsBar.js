import React, { useState } from 'react';
import OptionsPanel from './OptionsPanel';

const ControlsBar = ({
  selectedTool,
  setSelectedTool,
  colorSchemeKey,
  setColorSchemeKey,
  colorSchemes,
  isRunning,
  setIsRunning,
  step,
  draw,
  clear,
  snapshotsRef,
  setSteadyInfo,
  canvasRef,
  offsetRef,
  cellSize,
  setCellAlive,
  popHistoryRef,
  setShowChart,
  getLiveCells,
  popWindowSize,
  setPopWindowSize,
  popTolerance,
  setPopTolerance,
  shapes,
  shapesMenuOpen,
  setShapesMenuOpen,
  shapesMenuPos,
  setShapesMenuPos,
  shapesMenuRef,
  setSelectedShape,
  drawWithOverlay,
  steadyInfo,
  toolStateRef,
  cursorCell
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [wasRunningBeforeOptions, setWasRunningBeforeOptions] = useState(false);

  const OptionsToggle = () => {
    const open = () => {
      setWasRunningBeforeOptions(isRunning);
      // pause simulation while options modal is open
      if (isRunning) setIsRunning(false);
      setOptionsOpen(true);
    };
    const handleOk = () => {
      setOptionsOpen(false);
      // restore running state if it was running before
      if (wasRunningBeforeOptions) setIsRunning(true);
    };
    const handleCancel = () => {
      setOptionsOpen(false);
      if (wasRunningBeforeOptions) setIsRunning(true);
    };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
        <button onClick={open} title="Show options (color scheme and steady-state settings)">Options</button>
        {optionsOpen && (
          <OptionsPanel
            colorSchemes={colorSchemes}
            colorSchemeKey={colorSchemeKey}
            setColorSchemeKey={setColorSchemeKey}
            popWindowSize={popWindowSize}
            setPopWindowSize={setPopWindowSize}
            popTolerance={popTolerance}
            setPopTolerance={setPopTolerance}
            onOk={handleOk}
            onCancel={handleCancel}
          />
        )}
      </span>
    );
  };

  return (
    <div className="controls">
      <label style={{ marginRight: 8 }}>
        Tool: <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)} style={{ marginLeft: 8, marginRight: 12 }}>
          <option value='draw'>Freehand</option>
          <option value='line'>Line</option>
          <option value='rect'>Rectangle</option>
          <option value='circle'>Circle</option>
          <option value='oval'>Oval</option>
          <option value='randomRect'>Randomize Rect</option>
          <option value='shapes'>Shapes</option>
        </select>
      </label>
      {/* Options button toggles a small panel containing color scheme and steady-state options */}
      {/** Options toggle handled locally so the ControlsBar stays generic */}
      
      

      <button
        onClick={() => {
          if (!isRunning) {
            // clear steady guard so auto-stop can re-trigger
            // caller holds steadyDetectedRef; callers can manage it if present
          }
          setIsRunning(!isRunning);
        }}
        style={{ marginLeft: 8 }}
      >
        {isRunning ? 'Stop' : 'Start'}
      </button>
      <button onClick={() => { step(); draw(); }}>Step</button>
      <button onClick={() => { clear(); draw(); snapshotsRef.current = []; setSteadyInfo({ steady: false, period: 0, popChanging: false }); }}>Clear</button>
      
  <button style={{ marginLeft: 8 }} onClick={() => setShowChart(true)}>Show Population Chart</button>
  <OptionsToggle />
      <span style={{ marginLeft: 8 }}>Live Cells: {getLiveCells().size}</span>
      {/* Tool status area */}
      <div style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 12 }}>
        {selectedTool === 'line' ? (() => {
          const ts = toolStateRef?.current || {};
          const start = ts.start || ts.lastStart || null;
          const end = ts.last || cursorCell || null;
          const fmt = (p) => p ? `${p.x},${p.y}` : '—';
          const dx = (start && end) ? (end.x - start.x) : null;
          const dy = (start && end) ? (end.y - start.y) : null;
          return (<span>Start: {fmt(start)}  End: {fmt(end)}  Δ: {dx == null ? '—' : `${dx},${dy}`}</span>);
        })() : (
          <span>Cursor: {cursorCell ? `${cursorCell.x},${cursorCell.y}` : '—'}</span>
        )}
      </div>
      {/* OptionsPanel is rendered via the OptionsToggle component below */}
      <span title={steadyInfo.steady ? `Steady state (period ${steadyInfo.period})` : 'Running'} style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ fontSize: 18, opacity: (isRunning && steadyInfo.popChanging) ? 1 : 0.25 }}>{(isRunning && steadyInfo.popChanging) ? '💡' : '💡'}</span>
        <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>{steadyInfo.steady ? `Steady (p=${steadyInfo.period})` : (isRunning ? 'Running' : 'Idle')}</span>
      </span>
      {shapesMenuOpen && (
        <div
          ref={shapesMenuRef}
          className="shapes-menu"
          style={{ left: shapesMenuPos.x, top: shapesMenuPos.y }}
        >
          {['', ...Object.keys(shapes)].map((shapeKey) => (
            <div
              key={shapeKey || '__eraser'}
              className="shapes-menu-item"
              onMouseDown={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                const val = shapeKey || '';
                setSelectedShape?.(val || null);
                setShapesMenuOpen(false);
                drawWithOverlay();
              }}
            >
              {shapeKey === '' ? 'Eraser' : shapeKey}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlsBar;
