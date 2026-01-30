import React from 'react';
import './LoadingShapesOverlay.css';
import PropTypes from 'prop-types';

export default function LoadingShapesOverlay({ loading, progress, error, onRetry }) {
  if (!loading && !error) return null;

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;

  return (
    <div className="gol-loading-overlay" role="status" aria-live="polite">
      <div className="gol-loading-card">
        <div className="gol-loading-title">Loading shapes…</div>
        {percent !== null ? (
          <div className="gol-loading-progress">{percent}%</div>
        ) : (
          <div className="gol-loading-progress">Preparing…</div>
        )}
        {error ? (
          <div className="gol-loading-error">
            <div>Failed to load shapes.</div>
            <button type="button" onClick={onRetry}>Retry</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
LoadingShapesOverlay.propTypes = {
  loading: PropTypes.bool.isRequired,
  progress: PropTypes.shape({
    total: PropTypes.number,
    done: PropTypes.number
  }),
  error: PropTypes.any,
  onRetry: PropTypes.func
};
