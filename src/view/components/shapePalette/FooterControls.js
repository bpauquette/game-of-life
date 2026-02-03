import React from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

const SPACE_BETWEEN = 'space-between';
const FOOTER_ROW_STYLE = {
  display: 'flex',
  justifyContent: SPACE_BETWEEN,
  alignItems: 'center',
  marginTop: 8,
};

function FooterControls({ total, threshold, page, limit, canPagePrev, canPageNext, onPrevPage, onNextPage, loading, busy }) {
  const startIdx = total === 0 ? 0 : page * limit + 1;
  const endIdx = total === 0 ? 0 : Math.min(total, (page + 1) * limit);
  return (
    <div style={FOOTER_ROW_STYLE}>
      <div>
        {total > 0 && (
          <small>
            Showing {startIdx}–{endIdx} of {total} shapes{total > threshold ? ' — large catalog, use search or paging' : ''}
          </small>
        )}
      </div>
      <div>
        <Stack direction="row" spacing={1}>
          <Button onClick={onPrevPage} disabled={busy || loading || !canPagePrev}>Prev</Button>
          <Button onClick={onNextPage} disabled={busy || loading || !canPageNext}>Next</Button>
        </Stack>
      </div>
    </div>
  );
}

FooterControls.propTypes = {
  total: PropTypes.number.isRequired,
  threshold: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  canPagePrev: PropTypes.bool,
  canPageNext: PropTypes.bool,
  onPrevPage: PropTypes.func,
  onNextPage: PropTypes.func,
  loading: PropTypes.bool,
  busy: PropTypes.bool,
};

export default FooterControls;
