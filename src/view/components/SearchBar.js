import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { Close as CloseIcon } from '@mui/icons-material';

export default function SearchBar({ value, onChange, onClose, isMobile }) {
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      inputRef.current?.focus();
    } catch {
      // ignore focus errors in non-DOM environments
    }
  }, []);
  return (
    <div
      data-testid="shape-search-bar"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: isMobile ? 'stretch' : 'flex-start',
        marginBottom: 8,
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <TextField
          label="Search shapes"
          inputRef={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          placeholder="Type 3+ chars to search"
          size="small"
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: 8,
          alignItems: isMobile ? 'center' : 'flex-end',
          justifyContent: isMobile ? 'flex-end' : 'flex-start',
          width: isMobile ? '100%' : 'auto'
        }}
      >
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
  onClose: PropTypes.func,
  isMobile: PropTypes.bool
};

SearchBar.defaultProps = {
  onClose: undefined,
  isMobile: false,
};
