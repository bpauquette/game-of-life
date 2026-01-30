import React from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import { BUTTONS } from '../../../utils/Constants.js';

const SPACE_BETWEEN = 'space-between';
const FOOTER_ROW_STYLE = {
  display: 'flex',
  justifyContent: SPACE_BETWEEN,
  alignItems: 'center',
  marginTop: 8,
};

function FooterControls({ total, threshold, canLoadMore, onLoadMore, loading }) {
  return (
    <div style={FOOTER_ROW_STYLE}>
      <div>
        {total > 0 && (
          <small>
            {total} shapes in catalog{total > threshold ? ' — large catalog, use search or paging' : ''}
          </small>
        )}
      </div>
      <div>
        {canLoadMore && (
          <Button onClick={onLoadMore} disabled={loading}>
            {BUTTONS.LOAD_MORE}
          </Button>
        )}
      </div>
    </div>
  );
}

FooterControls.propTypes = {
  total: PropTypes.number.isRequired,
  threshold: PropTypes.number.isRequired,
  canLoadMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  loading: PropTypes.bool,
};

export default FooterControls;
