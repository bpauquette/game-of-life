import React from 'react';
import PropTypes from 'prop-types';
import ControlsBarView from './view/ControlsBar';

// Thin wrapper so tools or older imports that reference `src/ControlsBar.js`
// have a file-level propTypes definition and satisfy static linters
// (some analyzers index multiple path variants). This simply forwards
// to the real implementation under `src/view/ControlsBar`.
const ControlsBar = (props) => <ControlsBarView {...props} />;

ControlsBar.propTypes = {
  selectedTool: PropTypes.string.isRequired,
  setSelectedTool: PropTypes.func.isRequired,
  isRunning: PropTypes.bool.isRequired,
  setIsRunning: PropTypes.func.isRequired,
  step: PropTypes.func.isRequired,
  draw: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  snapshotsRef: PropTypes.object.isRequired,
  setSteadyInfo: PropTypes.func.isRequired,
  setShowChart: PropTypes.func.isRequired,
  getLiveCells: PropTypes.func.isRequired,
  shapes: PropTypes.array.isRequired,
  selectShape: PropTypes.func.isRequired,
  drawWithOverlay: PropTypes.func.isRequired,
  steadyInfo: PropTypes.string,
  toolStateRef: PropTypes.object.isRequired,
  cursorCell: PropTypes.object,
  selectedShape: PropTypes.object,
  openPalette: PropTypes.func.isRequired,
  generation: PropTypes.number.isRequired,
  onLoadGrid: PropTypes.func.isRequired,
  colorSchemes: PropTypes.object.isRequired,
  colorSchemeKey: PropTypes.string.isRequired,
  setColorSchemeKey: PropTypes.func.isRequired,
  popWindowSize: PropTypes.number.isRequired,
  setPopWindowSize: PropTypes.func.isRequired,
  popTolerance: PropTypes.number.isRequired,
  setPopTolerance: PropTypes.func.isRequired,
  // Performance props
  showSpeedGauge: PropTypes.bool,
  setShowSpeedGauge: PropTypes.func,
  maxFPS: PropTypes.number,
  setMaxFPS: PropTypes.func,
  maxGPS: PropTypes.number,
  setMaxGPS: PropTypes.func
};

export default ControlsBar;
