import React from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export default function SearchBar({ value, onChange, loading, onClose, onClear }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <TextField
        label="Search shapes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        placeholder="Type 3+ chars to search"
        size="small"
      />
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
