import React from 'react';
import PropTypes from 'prop-types';

const SHAPE_CARD_BORDER = '2px solid var(--accent-success)';
const SHAPE_CARD_RADIUS = 8;

function ShapeCard({ children, style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        border: SHAPE_CARD_BORDER,
        borderRadius: SHAPE_CARD_RADIUS,
        background: 'var(--surface-muted)',
        padding: '10px 10px 12px 10px',
        minWidth: 0,
        width: 'auto',
        maxWidth: 160,
        ...style
      }}
    >
      {children}
    </div>
  );
}

ShapeCard.propTypes = {
  children: PropTypes.node,
  style: PropTypes.object
};

export default ShapeCard;