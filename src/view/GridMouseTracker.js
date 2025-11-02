import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import useGridMousePosition from './hooks/useGridMousePosition';

/**
 * Displays the mouse position in grid coordinates (cellX, cellY) over the canvas.
 * Usage: Place this component near your canvas, pass the canvas ref and cellSize.
 */
const GridMouseTracker = ({ cellSize = 20 }) => {
  const canvasRef = useRef(null);
  const gridPosition = useGridMousePosition({ canvasRef, cellSize });

  return (
    <div>
      <h2>Grid Mouse Position Tracker</h2>
      <canvas ref={canvasRef} width={200} height={200} style={{ border: '1px solid #ccc' }} />
      <p>Grid X: {gridPosition.x}</p>
      <p>Grid Y: {gridPosition.y}</p>
    </div>
  );
};
GridMouseTracker.propTypes = {
  cellSize: PropTypes.number
};

export default GridMouseTracker;
