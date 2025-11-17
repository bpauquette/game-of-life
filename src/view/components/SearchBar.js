import React from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { Close as CloseIcon } from '@mui/icons-material';

export default function SearchBar({ value, onChange, onClose }) {


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
         {typeof onClose === 'function' && (
          <IconButton aria-label="close" size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
}

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func
};

SearchBar.defaultProps = {
  onClose: undefined,
};
