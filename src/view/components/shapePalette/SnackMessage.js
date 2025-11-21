import React from 'react';
import PropTypes from 'prop-types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Slide from '@mui/material/Slide';

const SlideUpTransition = (props) => <Slide {...props} direction="up" />;

function SnackMessage({ open, message, details, canUndo, onUndo, onClose }) {
  return (
    <Snackbar open={open} autoHideDuration={6000} onClose={onClose} slots={{ transition: SlideUpTransition }}>
      <Alert onClose={onClose} severity="info" action={canUndo ? (
        <Button color="inherit" size="small" onClick={onUndo}>
          UNDO
        </Button>
      ) : null}
      >
        <div>
          <div>{message}</div>
          {details && (
            <pre style={{ margin: '8px 0 0 0', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {details}
            </pre>
          )}
        </div>
      </Alert>
    </Snackbar>
  );
}

SnackMessage.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string,
  details: PropTypes.string,
  canUndo: PropTypes.bool,
  onUndo: PropTypes.func,
  onClose: PropTypes.func,
};

export default SnackMessage;
