import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpeedGauge.css';

/**
 * Performance monitoring component that displays FPS, generation rate,
 * cell count, and other performance metrics in a compact gauge format.
 */
const SpeedGauge = ({ 
  isVisible = true, 
  gameRef = null, // Reference to the game MVC instance
  onToggleVisibility,
  position = { top: 10, right: 10 },
  generation = 0,
  liveCellsCount = 0,
  embedded = false
}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    gps: 0,
    generation: 0,
    population: 0,
    peakCells: 0
  });

  // Initialize metrics synchronously from gameRef if available so tests
  // that render the component and immediately read the DOM will see the
  // expected formatted values without waiting for the interval to tick.
  useEffect(() => {
    if (gameRef?.current?.getPerformanceMetrics) {
      const modelMetrics = gameRef.current.getPerformanceMetrics();
      peakCellsRef.current = Math.max(peakCellsRef.current, modelMetrics.population || 0);
      setMetrics({
        fps: modelMetrics.fps || 0,
        gps: modelMetrics.gps || 0,
        generation: modelMetrics.generation || 0,
        population: modelMetrics.population || 0,
        peakCells: peakCellsRef.current
      });
      return;
    }

    // If there's no gameRef available (common in unit tests), use the
    // provided props to seed the initial metrics so tests can assert
    // formatted values immediately.
    peakCellsRef.current = Math.max(peakCellsRef.current, liveCellsCount || 0);
    setMetrics({
      fps: 0,
      gps: 0,
      generation: generation || 0,
      population: liveCellsCount || 0,
      peakCells: peakCellsRef.current
    });
    // run when gameRef or the seed props change
  }, [gameRef, generation, liveCellsCount]);

  const [isExpanded, setIsExpanded] = useState(false);
  const peakCellsRef = useRef(0);

  // Update metrics every second by getting them from the game model
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameRef?.current?.getPerformanceMetrics) {
        const modelMetrics = gameRef.current.getPerformanceMetrics();
        
        // Track peak cell count
        if (modelMetrics.population > peakCellsRef.current) {
          peakCellsRef.current = modelMetrics.population;
        }
        
        setMetrics({
          fps: modelMetrics.fps || 0,
          gps: modelMetrics.gps || 0,
          generation: modelMetrics.generation || 0,
          population: modelMetrics.population || 0,
          peakCells: peakCellsRef.current
        });
      }
    }, 250); // Update more frequently for better responsiveness

    return () => clearInterval(interval);
  }, [gameRef]);

  // Build positioning style supporting top/right/bottom/left
  const posStyle = {};
  if (typeof position.top === 'number') posStyle.top = position.top;
  if (typeof position.right === 'number') posStyle.right = position.right;
  if (typeof position.bottom === 'number') posStyle.bottom = position.bottom;
  if (typeof position.left === 'number') posStyle.left = position.left;

  // In embedded mode, always visible and simplified (no minimize button)
  if (!embedded && !isVisible) {
    return (
      <button
        type="button"
        className="speed-gauge minimized"
        style={posStyle}
        onClick={() => onToggleVisibility?.(true)}
        aria-label="Show performance gauge"
        title="Show performance gauge"
      >
        📊
      </button>
    );
  }

  const getPerformanceColor = (fps) => {
    if (fps >= 55) return '#4CAF50'; // Green - excellent
    if (fps >= 30) return '#FFC107'; // Yellow - good
    if (fps >= 15) return '#FF9800'; // Orange - poor
    return '#F44336'; // Red - bad
  };

  // Force expanded view for embedded mode and hide controls
  const effectiveExpanded = embedded ? true : isExpanded;

  return (
    <div 
      className={`speed-gauge ${effectiveExpanded ? 'expanded' : 'compact'}${embedded ? ' embedded' : ''}`}
      style={posStyle}
    >
      <div className="gauge-header">
        <span className="gauge-title">Performance</span>
        {!embedded && (
          <div className="gauge-controls">
            <button 
              className="gauge-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
            <button 
              className="gauge-button"
              onClick={() => onToggleVisibility?.(false)}
              title="Hide"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="gauge-content">
        {/* Always visible metrics */}
        <div className="metric-row primary">
          <span className="metric-label">FPS:</span>
          <span 
            className="metric-value"
            style={{ color: getPerformanceColor(metrics.fps) }}
          >
            {metrics.fps}
          </span>
        </div>
        
        <div className="metric-row primary">
          <span className="metric-label">Gen/s:</span>
          <span className="metric-value">{metrics.gps}</span>
        </div>

        {effectiveExpanded && (
          <>
            <div className="metric-row">
              <span className="metric-label">Cells:</span>
              {/* Render formatted population as a single text node to keep tests simple */}
              <span className="metric-value">{String(metrics.population.toLocaleString())}</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Peak:</span>
              <span className="metric-value">{metrics.peakCells.toLocaleString()}</span>
            </div>
            
                <div className="metric-row">
                  <span className="metric-label">Gen:</span>
                  <span className="metric-value">#{metrics.generation}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Frame:</span>
                  <span className="metric-value">{metrics.fps}</span>
                </div>

            <div className="performance-indicator">
              <div 
                className="performance-bar"
                style={{ 
                  width: `${Math.min(100, (metrics.fps / 60) * 100)}%`,
                  backgroundColor: getPerformanceColor(metrics.fps)
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeedGauge;

SpeedGauge.propTypes = {
  isVisible: PropTypes.bool,
  gameRef: PropTypes.object,
  onToggleVisibility: PropTypes.func,
  position: PropTypes.shape({ top: PropTypes.number, right: PropTypes.number }),
  generation: PropTypes.number,
  liveCellsCount: PropTypes.number,
  embedded: PropTypes.bool
};