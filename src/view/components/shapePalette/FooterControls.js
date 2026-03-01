import React from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

const SPACE_BETWEEN = 'space-between';

function FooterControls({
  total,
  threshold,
  page,
  limit,
  canPagePrev,
  canPageNext,
  onPrevPage,
  onNextPage,
  loading,
  busy,
  isMobile,
}) {
  const startIdx = total === 0 ? 0 : page * limit + 1;
  const endIdx = total === 0 ? 0 : Math.min(total, (page + 1) * limit);
  return (
    <Box
      data-testid="shape-palette-footer"
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: SPACE_BETWEEN,
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 1 : 0,
        mt: 1
      }}
    >
      <div style={{ minWidth: 0 }}>
        {total > 0 && (
          <small>
            Showing {startIdx}–{endIdx} of {total} shapes{total > threshold ? ' — large catalog, use search or paging' : ''}
          </small>
        )}
      </div>
      <div style={{ width: isMobile ? '100%' : 'auto' }}>
        <Stack direction="row" spacing={1} justifyContent={isMobile ? 'space-between' : 'flex-start'}>
          <Button onClick={onPrevPage} disabled={busy || loading || !canPagePrev}>Prev</Button>
          <Button onClick={onNextPage} disabled={busy || loading || !canPageNext}>Next</Button>
        </Stack>
      </div>
    </Box>
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
  isMobile: PropTypes.bool,
};

export default FooterControls;
