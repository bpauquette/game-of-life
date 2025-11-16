import React from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { Close as CloseIcon } from '@mui/icons-material';

export default function SearchBar({ value, onChange, loading, onClose, onClear }) {


  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <TextField
          label="Search shapes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          placeholder="Type 3+ chars to search"
          size="small"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        {loading && <CircularProgress size={24} />}
        {typeof onClear === 'function' && (
          <Button size="small" variant="outlined" onClick={onClear} data-testid="clear-cache-btn">
            Clear Cache
          </Button>
        )}
        {typeof onClose === 'function' && (
          <IconButton aria-label="close" size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </div>
      {/* Preview is rendered by a separate component to avoid layout interference */}
    </div>
  );
}

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onClear: PropTypes.func
};

SearchBar.defaultProps = {
  loading: false,
  caching: false
};
