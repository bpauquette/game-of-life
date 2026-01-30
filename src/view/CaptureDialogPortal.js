import React from 'react';
import PropTypes from 'prop-types';
import CaptureShapeDialog from './CaptureShapeDialog.js';

function CaptureDialogPortal({ open, onClose, captureData, onSave }) {
  if (!open) return null;
  return (
    <CaptureShapeDialog open={open} onClose={onClose} captureData={captureData} onSave={onSave} />
  );
}

CaptureDialogPortal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  captureData: PropTypes.object,
  onSave: PropTypes.func
};

export default CaptureDialogPortal;
