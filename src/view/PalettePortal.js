import React from 'react';
import PropTypes from 'prop-types';
import ShapePaletteDialog from './ShapePaletteDialog';

function PalettePortal({ open, onClose, onSelectShape, backendBase, colorScheme, onAddRecent }) {
  if (!open) return null;
  return (
    <ShapePaletteDialog
      open={open}
      onClose={onClose}
      onSelectShape={onSelectShape}
      backendBase={backendBase}
      colorScheme={colorScheme}
      onAddRecent={onAddRecent}
    />
  );
}

PalettePortal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSelectShape: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object,
  onAddRecent: PropTypes.func
};

export default PalettePortal;
