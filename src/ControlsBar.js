import React from 'react';

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
  steadyInfo
}) => {
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
      <label htmlFor="color-scheme-select" style={{ marginRight: 8 }}>Color Scheme:</label>
      <select
        id="color-scheme-select"
        value={colorSchemeKey}
        onChange={(e) => setColorSchemeKey(e.target.value)}
        style={{ marginRight: 8 }}
      >
        {Object.entries(colorSchemes).map(([key, scheme]) => (
          <option key={key} value={key}>{scheme.name}</option>
        ))}
      </select>

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
      <button onClick={() => {
        // Place a centered blinker
        const canvas = canvasRef.current;
        if (!canvas || !offsetRef?.current) return;
        const rect = canvas.getBoundingClientRect();
        const centerCssX = rect.width / 2;
        const centerCssY = rect.height / 2;
        const cx = Math.floor(offsetRef.current.x + (centerCssX - centerCssX) / cellSize);
        const cy = Math.floor(offsetRef.current.y + (centerCssY - centerCssY) / cellSize);
        const coords = [ [-1,0],[0,0],[1,0] ];
        coords.forEach(([dx,dy]) => setCellAlive(cx + dx, cy + dy, true));
        try { popHistoryRef.current.push(getLiveCells().size); if (popHistoryRef.current.length > 1000) popHistoryRef.current.shift(); } catch (err) {}
        snapshotsRef.current = [];
        setSteadyInfo({ steady: false, period: 0, popChanging: false });
        drawWithOverlay();
      }}>Place Blinker</button>
      <button style={{ marginLeft: 8 }} onClick={() => setShowChart(true)}>Show Population Chart</button>
      <span style={{ marginLeft: 8 }}>Live Cells: {getLiveCells().size}</span>
      <label style={{ marginLeft: 12, fontSize: 12 }}>N:
        <input
          type="number"
          min={1}
          max={500}
          value={popWindowSize}
          onChange={(e) => setPopWindowSize(Math.max(1, Number(e.target.value) || 1))}
          style={{ width: 60, marginLeft: 6 }}
        />
      </label>
      <label style={{ marginLeft: 8, fontSize: 12 }}>X:
        <input
          type="number"
          min={0}
          max={1000}
          value={popTolerance}
          onChange={(e) => setPopTolerance(Math.max(0, Number(e.target.value) || 0))}
          style={{ width: 60, marginLeft: 6 }}
        />
      </label>
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
