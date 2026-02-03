import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SearchBar from './components/SearchBar.js';
import PreviewPanel from './components/PreviewPanel.js';
import {
  ShapesList,
  FooterControls,
  DeleteConfirmDialog,
  SnackMessage,
  BackendServerDialog,
} from './components/shapePalette/index.js';

export default function ShapePaletteView({
  open,
  onClose,
  onBackendClose,
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
  page,
  limit,
  canPagePrev,
  canPageNext,
  onPrevPage,
  onNextPage,
  paging,
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
  backendBase,
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
        maxWidth={isMobile ? 'xs' : 'xl'}
        fullWidth
        fullScreen={isMobile}
        PaperProps={!isMobile ? { sx: { height: 'auto', maxHeight: '80vh' } } : undefined}
        data-testid="shapes-palette"
      >
        <DialogTitle>Insert shape from catalog</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 2, overflowX: 'hidden', overflowY: 'visible' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <SearchBar value={inputValue} onChange={setInputValue} onClose={onClose} />
            <Box sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 0 }}>
              <PreviewPanel
                key={selectedShape?.id || selectedShape?.name || 'preview'}
                preview={selectedShape}
                colorScheme={colorScheme}
                colorSchemeKey={colorSchemeKey}
                onAddRecent={onAddRecent}
                compact={true}
                maxSvgSize={80}
              />
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
              backendBase={backendBase}
            />

            {isMobile && isInitialMobileLoad && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  bgcolor: 'rgba(0,0,0,0.22)',
                  borderRadius: 1,
                  textAlign: 'center',
                  px: 2
                }}
                aria-live="polite"
              >
                <CircularProgress size={32} thickness={4} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Loading shapes…
                </Typography>
              </Box>
            )}
          </Box>

          <FooterControls
            total={total}
            threshold={threshold}
            page={page}
            limit={limit}
            canPagePrev={canPagePrev}
            canPageNext={canPageNext}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
            loading={loading}
            busy={paging}
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
        onClose={onBackendClose}
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
  page: PropTypes.number,
  limit: PropTypes.number,
  canPagePrev: PropTypes.bool,
  canPageNext: PropTypes.bool,
  onPrevPage: PropTypes.func,
  onNextPage: PropTypes.func,
  paging: PropTypes.bool,
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
  onBackendClose: PropTypes.func,
  backendBase: PropTypes.string,
  colorScheme: PropTypes.object,
  colorSchemeKey: PropTypes.string,
  user: PropTypes.object,
};
