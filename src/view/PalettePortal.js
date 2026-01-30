import React from 'react';
import PropTypes from 'prop-types';
import ShapePaletteDialog from './ShapePaletteDialog.js';
import { useUiDao } from '../model/dao/uiDao.js';

function PalettePortal({ open, onClose, onSelectShape, backendBase, onAddRecent, prefetchOnMount = false }) {
  // UI state from uiDao
  const colorScheme = useUiDao(state => state.colorScheme);
  const colorSchemeKey = useUiDao(state => state.colorSchemeKey || 'bio');
  // Always mount the ShapePaletteDialog so it can preload the catalog and
  // keep its cached state across open/close cycles. The `open` prop still
  // controls visibility; mounting once at app start avoids expensive remounts.
  return (
    <ShapePaletteDialog
      open={open}
      onClose={onClose}
      onSelectShape={onSelectShape}
      backendBase={backendBase}
      colorScheme={colorScheme}
      colorSchemeKey={colorSchemeKey}
      onAddRecent={onAddRecent}
      prefetchOnMount={prefetchOnMount}
    />
  );
}

PalettePortal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSelectShape: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string,
  onAddRecent: PropTypes.func,
  prefetchOnMount: PropTypes.bool,
};

export default PalettePortal;
