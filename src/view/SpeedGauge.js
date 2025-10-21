import React, { useState, useRef, useEffect } from 'react';
import './SpeedGauge.css';

/**
 * Performance monitoring component that displays FPS, generation rate,
 * cell count, and other performance metrics in a compact gauge format.
 */
const SpeedGauge = ({ 
  isVisible = true, 
  generation = 0, 
  liveCellsCount = 0,
  onToggleVisibility,
  position = { top: 10, right: 10 }
}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    gps: 0, // generations per second
    avgFrameTime: 0,
    peakCells: 0,
    renderTime: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastGenerationRef = useRef(generation);
  const frameTimesRef = useRef([]);
  const renderTimesRef = useRef([]);
  const peakCellsRef = useRef(0);

  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      
      if (deltaTime >= 1000) { // Update every second
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        const gps = Math.round(((generation - lastGenerationRef.current) * 1000) / deltaTime);
        
        // Calculate average frame time from recent samples
        const frameTimes = frameTimesRef.current;
        const avgFrameTime = frameTimes.length > 0 
          ? frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length 
          : 0;

        // Calculate average render time
        const renderTimes = renderTimesRef.current;
        const avgRenderTime = renderTimes.length > 0
          ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
          : 0;

        // Track peak cell count
        if (liveCellsCount > peakCellsRef.current) {
          peakCellsRef.current = liveCellsCount;
        }

        setMetrics({
          fps,
          gps,
          avgFrameTime: Math.round(avgFrameTime * 100) / 100,
          peakCells: peakCellsRef.current,
          renderTime: Math.round(avgRenderTime * 100) / 100
        });

        // Reset counters
        frameCountRef.current = 0;
        lastTimeRef.current = now;
        lastGenerationRef.current = generation;
        frameTimesRef.current = [];
        renderTimesRef.current = [];
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [generation, liveCellsCount]);

  // Expose frame tracking method for external use
  useEffect(() => {
    const trackFrame = (frameTime, renderTime) => {
      frameCountRef.current++;
      
      // Keep only recent frame times (max 60 samples)
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      if (renderTime !== undefined) {
        renderTimesRef.current.push(renderTime);
        if (renderTimesRef.current.length > 60) {
          renderTimesRef.current.shift();
        }
      }
    };

    // Attach to window for global access
    window.speedGaugeTracker = trackFrame;
    
    return () => {
      delete window.speedGaugeTracker;
    };
  }, []);

  if (!isVisible) {
    return (
      <div 
        className="speed-gauge minimized"
        style={{ top: position.top, right: position.right }}
        onClick={() => onToggleVisibility?.(true)}
      >
        📊
      </div>
    );
  }

  const getPerformanceColor = (fps) => {
    if (fps >= 55) return '#4CAF50'; // Green - excellent
    if (fps >= 30) return '#FFC107'; // Yellow - good
    if (fps >= 15) return '#FF9800'; // Orange - poor
    return '#F44336'; // Red - bad
  };

  return (
    <div 
      className={`speed-gauge ${isExpanded ? 'expanded' : 'compact'}`}
      style={{ top: position.top, right: position.right }}
    >
      <div className="gauge-header">
        <span className="gauge-title">Performance</span>
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

        {isExpanded && (
          <>
            <div className="metric-row">
              <span className="metric-label">Cells:</span>
              <span className="metric-value">{liveCellsCount.toLocaleString()}</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Peak:</span>
              <span className="metric-value">{metrics.peakCells.toLocaleString()}</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Frame:</span>
              <span className="metric-value">{metrics.avgFrameTime}ms</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Render:</span>
              <span className="metric-value">{metrics.renderTime}ms</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Gen:</span>
              <span className="metric-value">#{generation}</span>
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