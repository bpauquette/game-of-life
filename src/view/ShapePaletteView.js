import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SearchBar from './components/SearchBar';
import PreviewPanel from './components/PreviewPanel';
import {
  ShapesList,
  FooterControls,
  DeleteConfirmDialog,
  SnackMessage,
  BackendServerDialog,
} from './components/shapePalette';

export default function ShapePaletteView({
  open,
  onClose,
  isMobile,
  inputValue,
  setInputValue,
  selectedShape,
  onSelectShape,
  onAddRecent,
  shapesForRender,
  loading,
  isInitialMobileLoad,
  onDeleteRequest,
  confirmOpen,
  toDelete,
  onDeleteCancel,
  onDeleteConfirm,
  total,
  threshold,
  onLoadMore,
  snackOpen,
  snackMsg,
  snackDetails,
  snackUndoShape,
  onUndo,
  onSnackClose,
  showBackendDialog,
  backendError,
  backendStarting,
  onRetryBackend,
  onShowBackendInstructions,
  colorScheme,
  colorSchemeKey,
  user,
}) {
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        disableEscapeKeyDown={false}
        maxWidth={isMobile ? 'xs' : 'md'}
        fullWidth
        fullScreen={isMobile}
        data-testid="shapes-palette"
      >
        <DialogTitle>Insert shape from catalog</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 2, maxHeight: '80vh', overflowX: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <SearchBar value={inputValue} onChange={setInputValue} onClose={onClose} />
            <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 0 }}>
              <PreviewPanel preview={selectedShape} colorScheme={colorScheme} colorSchemeKey={colorSchemeKey} onAddRecent={onAddRecent} compact={true} maxSvgSize={80} />
            </Box>
          </Box>

          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 260,
              gap: isMobile ? 2 : 1
            }}
            data-testid="shapes-list-scroll"
          >
            <ShapesList
              items={shapesForRender}
              colorScheme={colorScheme}
              loading={loading}
              onSelect={onSelectShape}
              onDeleteRequest={onDeleteRequest}
              onAddRecent={onAddRecent}
              shapeSize={isMobile ? 64 : 40}
              showShapeNames={isMobile}
              user={user}
            />

            {isInitialMobileLoad && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  bgcolor: 'rgba(0,0,0,0.35)',
                  borderRadius: 1,
                  textAlign: 'center',
                  px: 2
                }}
                aria-live="polite"
              >
                <CircularProgress size={32} thickness={4} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Loading shapes catalog…
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  This may take a few seconds on mobile networks. The list will populate automatically.
                </Typography>
              </Box>
            )}
          </Box>

          <FooterControls
            total={total}
            threshold={threshold}
            canLoadMore={false}
            onLoadMore={onLoadMore}
            loading={loading}
          />

          <DeleteConfirmDialog
            open={confirmOpen}
            shape={toDelete}
            onCancel={onDeleteCancel}
            onConfirm={onDeleteConfirm}
          />
        </DialogContent>
      </Dialog>

      <SnackMessage
        open={snackOpen}
        message={snackMsg}
        details={snackDetails}
        canUndo={!!snackUndoShape}
        onUndo={onUndo}
        onClose={onSnackClose}
      />

      <BackendServerDialog
        open={showBackendDialog}
        onClose={() => {}}
        backendError={backendError}
        backendStarting={backendStarting}
        onRetry={onRetryBackend}
        onShowInstructions={onShowBackendInstructions}
      />
    </>
  );
}

ShapePaletteView.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  isMobile: PropTypes.bool,
  inputValue: PropTypes.string,
  setInputValue: PropTypes.func,
  selectedShape: PropTypes.object,
  onSelectShape: PropTypes.func,
  onAddRecent: PropTypes.func,
  shapesForRender: PropTypes.array,
  loading: PropTypes.bool,
  isInitialMobileLoad: PropTypes.bool,
  onDeleteRequest: PropTypes.func,
  confirmOpen: PropTypes.bool,
  toDelete: PropTypes.object,
  onDeleteCancel: PropTypes.func,
  onDeleteConfirm: PropTypes.func,
  total: PropTypes.number,
  threshold: PropTypes.number,
  onLoadMore: PropTypes.func,
  snackOpen: PropTypes.bool,
  snackMsg: PropTypes.string,
  snackDetails: PropTypes.string,
  snackUndoShape: PropTypes.object,
  onUndo: PropTypes.func,
  onSnackClose: PropTypes.func,
  showBackendDialog: PropTypes.bool,
  backendError: PropTypes.string,
  backendStarting: PropTypes.bool,
  onRetryBackend: PropTypes.func,
  onShowBackendInstructions: PropTypes.func,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string,
  user: PropTypes.object,
};
