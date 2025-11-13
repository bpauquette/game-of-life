import React from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';

export default function SearchBar({ value, onChange, loading, onCache, caching }) {
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
      {typeof onCache === 'function' && (
        <Button size="small" variant="outlined" onClick={onCache} disabled={caching}>
          {caching ? 'Caching…' : 'Cache Catalog'}
        </Button>
      )}
    </div>
  );
}

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onCache: PropTypes.func,
  caching: PropTypes.bool
};

SearchBar.defaultProps = {
  loading: false,
  caching: false
};
